import { create } from 'zustand';
import {
  submitBatch,
  getStatus,
  cancelBatch,
  type PdfInputFile,
  type BatchStatusData,
  type ServerJobStatus,
} from '@/services/pdfConversion';
import { trackEvent } from '@/services/analyticsService';

/**
 * Drives one PDF conversion batch through the wireframe state machine (part 4).
 *
 * Phases mirror the wireframe exactly. `failed` means completed-with-failures
 * (state 8). `busy`/`unreachable` are the two flavors of the error state (state
 * 7); `tooLarge` rides on the `unreachable` phase but is flagged so the UI can
 * show the 413 sentence and hide retry.
 *
 * Polling, the consecutive-failure counter, the retry input, and the timer are
 * module-scoped because there is exactly one batch in flight at a time.
 *
 * Unload safety (ruling 12): a keepalive cancel frees an abandoned batch on the
 * server. It fires only on `pagehide` (real page unload) and on leaving the
 * surface while in flight (`leaveSurface`, called from PdfFlow unmount / Start
 * Over). `visibilitychange: hidden` is deliberately NOT a trigger, so switching
 * tabs never cancels a queued or converting batch.
 */

export type PdfPhase =
  | 'idle'
  | 'consent'
  | 'sending'
  | 'queued'
  | 'converting'
  | 'done'
  | 'canceled'
  | 'busy'
  | 'unreachable'
  | 'failed';

export type PdfFileStatus = 'waiting' | 'converting' | 'done' | 'failed';

export interface PdfFile {
  stem: string;
  status: PdfFileStatus;
}

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_FAILURES = 3;

// Remembered PDF consent (the pre-conversion consent gate). localStorage can
// throw in private mode, so every access is guarded; any failure means "not
// remembered". The flag is written only on confirm-with-remember.
const PDF_CONSENT_KEY = 'veidne.pdfConsent';
const PDF_CONSENT_VALUE = 'granted';

function isPdfConsentRemembered(): boolean {
  try {
    return localStorage.getItem(PDF_CONSENT_KEY) === PDF_CONSENT_VALUE;
  } catch {
    return false;
  }
}

function rememberPdfConsent(): void {
  try {
    localStorage.setItem(PDF_CONSENT_KEY, PDF_CONSENT_VALUE);
  } catch {
    /* private mode or storage full: proceed without remembering */
  }
}

interface PdfState {
  phase: PdfPhase;
  batchId: string | null;
  files: PdfFile[];
  completedCount: number;
  failedCount: number;
  totalCount: number;
  position: number;
  etaSeconds: number;
  /** Set from the cancel response: how many PDFs finished before the cancel. */
  canceledAtCount: number | null;
  /** True only for the 413 flavor of `unreachable` (own copy, no retry). */
  tooLarge: boolean;
  /** Whether the `unreachable` phase offers a retry button (false for 413 and TTL-expired results). */
  retryable: boolean;
  start: (files: PdfInputFile[]) => Promise<void>;
  /** Consent gate: proceed with the send; `remember` persists the device flag. */
  confirmConsent: (remember: boolean) => Promise<void>;
  /** Consent gate: decline, return to the entry surface; no flag, no request. */
  declineConsent: () => void;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  /** Leaving the surface (unmount / Start Over): keepalive-cancel if in flight, then reset. */
  leaveSurface: () => void;
  /** A terminal result fetch 404'd (TTL expired): unreachable copy, retry hidden, Word offered (part 7). */
  markResultExpired: () => void;
}

const initialState = {
  phase: 'idle' as PdfPhase,
  batchId: null as string | null,
  files: [] as PdfFile[],
  completedCount: 0,
  failedCount: 0,
  totalCount: 0,
  position: 0,
  etaSeconds: 0,
  canceledAtCount: null as number | null,
  tooLarge: false,
  retryable: true,
};

// --- module-scoped run state (single in-flight batch) ----------------------
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollFailures = 0;
let lastInputFiles: PdfInputFile[] = [];
let pagehideHandler: (() => void) | null = null;
// `pdf_generated` fires exactly once per batch, when the flow first reaches a
// terminal phase (done, failed, or canceled) (part 8). Reset on every start.
let pdfGeneratedFired = false;

const isInFlight = (p: PdfPhase): boolean =>
  p === 'sending' || p === 'queued' || p === 'converting';

/** queued -> waiting, running -> converting, done/failed pass through, canceled -> waiting. */
function mapJobStatus(status: ServerJobStatus): PdfFileStatus {
  switch (status) {
    case 'running':
      return 'converting';
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    case 'queued':
    case 'canceled':
    default:
      return 'waiting';
  }
}

/** Phase derivation from a status response (part 4). */
function derivePhase(s: BatchStatusData): PdfPhase {
  if (s.status === 'completed') return s.failed === 0 ? 'done' : 'failed';
  if (s.status === 'canceled') return 'canceled';
  const anyRunning = s.status === 'running' || s.jobs.some((j) => j.status === 'running');
  if (anyRunning) return 'converting';
  // A held place in line: show queued. position 0 means the queue is skipped.
  if (s.status === 'queued' && s.position > 0) return 'queued';
  return 'converting';
}

/**
 * Diff server job statuses into the files array by index, preserving the object
 * identity of unchanged rows (and the array identity when nothing changed) so a
 * per-index subscriber only re-renders the rows that actually moved (part 4/5).
 */
function diffFiles(prev: PdfFile[], s: BatchStatusData): PdfFile[] {
  const byIndex = new Map<number, ServerJobStatus>();
  for (const j of s.jobs) byIndex.set(j.index, j.status);

  let changed = false;
  const next = prev.map((file, i) => {
    const server = byIndex.get(i);
    if (server === undefined) return file;
    const mapped = mapJobStatus(server);
    if (mapped === file.status) return file;
    changed = true;
    return { ...file, status: mapped };
  });
  return changed ? next : prev;
}

/**
 * Freeze the list for the canceled phase (review fix 5): a consistent snapshot
 * of exactly `k` rows done and every other row waiting, with no live converting
 * spinners. Done rows are kept where they already completed; the count is then
 * trued up to exactly `k` (demoting surplus done rows from the bottom, or
 * promoting leading rows) so the list done-count agrees with the heading tally.
 */
function freezeCanceled(prev: PdfFile[], k: number): PdfFile[] {
  const target = Math.max(0, Math.min(k, prev.length));
  let doneCount = 0;
  const next = prev.map((f) => {
    if (f.status === 'done') {
      doneCount += 1;
      return f;
    }
    // No converting spinners on the frozen snapshot: anything not done is waiting.
    return f.status === 'waiting' ? f : { ...f, status: 'waiting' as PdfFileStatus };
  });
  for (let i = next.length - 1; i >= 0 && doneCount > target; i -= 1) {
    if (next[i].status === 'done') {
      next[i] = { ...next[i], status: 'waiting' };
      doneCount -= 1;
    }
  }
  for (let i = 0; i < next.length && doneCount < target; i += 1) {
    if (next[i].status === 'waiting') {
      next[i] = { ...next[i], status: 'done' };
      doneCount += 1;
    }
  }
  return next;
}

/**
 * Stop converting spinners for the unreachable phase (review fix 6): last-known
 * done/failed statuses may remain, but no row may appear to be actively
 * converting once the converter is unreachable. Converting rows fall back to
 * waiting (a static hollow dot, not a spinning ring).
 */
function stripConverting(prev: PdfFile[]): PdfFile[] {
  let changed = false;
  const next = prev.map((f) => {
    if (f.status !== 'converting') return f;
    changed = true;
    return { ...f, status: 'waiting' as PdfFileStatus };
  });
  return changed ? next : prev;
}

function stopPolling(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export const usePdfStore = create<PdfState>((set, get) => {
  // Keepalive cancel: free an abandoned batch on the server (ruling 12). Only
  // pagehide and leaveSurface call this; never visibilitychange.
  const fireKeepaliveCancel = (): void => {
    const { batchId, phase } = get();
    if (batchId && isInFlight(phase)) void cancelBatch(batchId, { keepalive: true });
  };
  const registerUnloadGuard = (): void => {
    if (typeof window === 'undefined' || pagehideHandler) return;
    pagehideHandler = () => fireKeepaliveCancel();
    window.addEventListener('pagehide', pagehideHandler);
  };
  const unregisterUnloadGuard = (): void => {
    if (typeof window !== 'undefined' && pagehideHandler) {
      window.removeEventListener('pagehide', pagehideHandler);
    }
    pagehideHandler = null;
  };

  // Fire `pdf_generated` once per batch on the first terminal phase (part 8).
  // The count is the number of PDFs actually completed.
  const fireGenerated = (completed: number): void => {
    if (pdfGeneratedFired) return;
    pdfGeneratedFired = true;
    trackEvent('pdf_generated', { count: String(completed) });
  };

  const scheduleNextPoll = (): void => {
    stopPolling();
    pollTimer = setTimeout(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
  };

  const pollOnce = async (): Promise<void> => {
    const { batchId, phase } = get();
    if (!batchId || !isInFlight(phase)) {
      stopPolling();
      return;
    }

    const result = await getStatus(batchId);

    // The user may have canceled or reset during the await.
    if (!get().batchId || !isInFlight(get().phase)) {
      stopPolling();
      return;
    }

    if (result.outcome === 'notFound') {
      stopPolling();
      set((state) => ({ phase: 'unreachable', tooLarge: false, retryable: true, files: stripConverting(state.files) }));
      return;
    }

    if (result.outcome === 'unreachable') {
      pollFailures += 1;
      if (pollFailures >= MAX_POLL_FAILURES) {
        stopPolling();
        set((state) => ({ phase: 'unreachable', tooLarge: false, retryable: true, files: stripConverting(state.files) }));
        return;
      }
      scheduleNextPoll();
      return;
    }

    pollFailures = 0;
    const s = result.status;
    const nextPhase = derivePhase(s);
    set((state) => ({
      files: diffFiles(state.files, s),
      completedCount: s.completed,
      failedCount: s.failed,
      totalCount: s.totalJobs,
      position: s.position,
      etaSeconds: s.etaSeconds,
      phase: nextPhase,
    }));

    // Terminal completion (done or failed): record the conversion once (part 8).
    if (nextPhase === 'done' || nextPhase === 'failed') fireGenerated(s.completed);

    if (isInFlight(nextPhase)) scheduleNextPoll();
    else stopPolling();
  };

  // The actual send: transition to sending and submit the batch. Shared by the
  // remembered-consent fast path, the consent confirm action, and retry, so the
  // batch-submit code lives in exactly one place. No request fires before here.
  const runSend = async (files: PdfInputFile[]): Promise<void> => {
    stopPolling();
    pollFailures = 0;
    pdfGeneratedFired = false;
    lastInputFiles = files;
    registerUnloadGuard();
    set({
      ...initialState,
      phase: 'sending',
      files: files.map((f) => ({ stem: f.stem, status: 'waiting' as PdfFileStatus })),
      totalCount: files.length,
    });

    const result = await submitBatch(files);

    // Abandoned during submit (cancel/reset): drop the stale result.
    if (get().phase !== 'sending') return;

    if (result.outcome === 'busy') {
      set({ phase: 'busy' });
      return;
    }
    if (result.outcome === 'tooLarge') {
      set((state) => ({ phase: 'unreachable', tooLarge: true, retryable: false, files: stripConverting(state.files) }));
      return;
    }
    if (result.outcome === 'unreachable') {
      set((state) => ({ phase: 'unreachable', tooLarge: false, retryable: true, files: stripConverting(state.files) }));
      return;
    }

    // Accepted: record the start once (part 8), then begin polling.
    trackEvent('pdf_started', { count: String(result.totalJobs) });
    set({ batchId: result.batchId, totalCount: result.totalJobs });
    void pollOnce();
  };

  return {
    ...initialState,

    start: async (files) => {
      // If consent is already remembered on this device, proceed straight to the
      // send unchanged. Otherwise show the consent gate and fire no network call;
      // the pending files are held for the confirm action.
      if (isPdfConsentRemembered()) {
        await runSend(files);
        return;
      }
      stopPolling();
      lastInputFiles = files;
      set({ ...initialState, phase: 'consent' });
    },

    confirmConsent: async (remember) => {
      if (remember) rememberPdfConsent();
      await runSend(lastInputFiles);
    },

    declineConsent: () => {
      // Back to the entry surface (Word download + Start Over intact). No flag is
      // written and no request was ever sent.
      set({ ...initialState });
    },

    cancel: async () => {
      stopPolling(); // optimistic: stop polling immediately
      const { batchId } = get();
      if (!batchId) {
        const tally = get().completedCount;
        set((state) => ({ phase: 'canceled', canceledAtCount: tally, files: freezeCanceled(state.files, tally) }));
        fireGenerated(tally);
        return;
      }
      const result = await cancelBatch(batchId);
      // Cancel always resolves locally (part 11): the user still has their Word
      // files and the server TTL cleans up even if the call failed.
      const tally = result.outcome === 'ok' ? result.completed : get().completedCount;
      // Freeze the list to a consistent snapshot: exactly `tally` rows done, the
      // rest waiting, no live spinners; the list done-count agrees with the
      // heading tally (review fix 5).
      set((state) => ({ phase: 'canceled', canceledAtCount: tally, files: freezeCanceled(state.files, tally) }));
      fireGenerated(tally);
    },

    retry: async () => {
      // Retry comes from busy/unreachable, already past the consent gate this
      // session, so it sends directly without re-gating.
      await runSend(lastInputFiles);
    },

    reset: () => {
      stopPolling();
      unregisterUnloadGuard();
      pollFailures = 0;
      lastInputFiles = [];
      set({ ...initialState });
    },

    leaveSurface: () => {
      fireKeepaliveCancel();
      get().reset();
    },

    markResultExpired: () => {
      set({ phase: 'unreachable', tooLarge: false, retryable: false });
    },
  };
});
