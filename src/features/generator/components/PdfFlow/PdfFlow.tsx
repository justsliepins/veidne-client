import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import JSZip from 'jszip';
import { mergeClasses } from '@fluentui/react-components';
import { Checkmark28Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import {
  getConvertApiUrl,
  getStatus,
  downloadResultZip,
  downloadSinglePdf,
} from '@/services/pdfConversion';
import { triggerDownload } from '@/features/generator/utils/downloadHelpers';
import type { GeneratedFile } from '@/features/generator/store/generatorStore';
import { usePdfStore, type PdfFile } from '@/features/generator/store/pdfStore';
import { FileStatusList } from '../FileStatusList';
import { useStyles } from './PdfFlow.styles';

interface PdfFlowProps {
  /** The generated Word files, in generation order (stems + blobs). */
  files: GeneratedFile[];
  /** The Word zip base stem; the PDF zip reuses it as `${baseName}-pdf.zip`. */
  baseName: string;
  /** The existing, untouched Word download action. */
  onDownloadWord: () => void;
  /** Optional: invoked after a successful PDF download fires (never before). */
  onAfterDownload?: () => void;
  /** Optional: single-file Word download for a list row, by stem. */
  onDownloadFile?: (stem: string) => void;
  /** Optional: invoked after a single PDF has been downloaded from a list
   *  row, so the Done screen can treat it like any single-file download. */
  onAfterFileDownload?: () => void;
}

const ShieldGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1.5 13 3.4v4.1c0 3.2-2.1 5.6-5 7-2.9-1.4-5-3.8-5-7V3.4L8 1.5Z"
      stroke="#46529E"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

// Consent-gate shield: a checked shield, paired with text (never color alone),
// matching the consent wireframe.
const ConsentShieldGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z"
      fill="rgba(85,102,196,.22)"
      stroke="#46529E"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="m8.5 12 2.3 2.3 4.7-4.7"
      stroke="#46529E"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Coarse wait estimate (part 6): never seconds. Under 75s reads "About a minute".
function coarseWait(etaSeconds: number): string {
  const minutes = Math.round(etaSeconds / 60);
  if (etaSeconds < 75 || minutes === 1) return t('pdf.queued.waitMinute');
  return t('pdf.queued.waitMinutes', { count: String(minutes) });
}

export function PdfFlow({ files, baseName, onDownloadWord, onAfterDownload, onDownloadFile, onAfterFileDownload }: PdfFlowProps) {
  const s = useStyles();
  const {
    phase,
    storeFiles,
    completedCount,
    failedCount,
    totalCount,
    position,
    etaSeconds,
    canceledAtCount,
    tooLarge,
    retryable,
  } = usePdfStore(
    useShallow((st) => ({
      phase: st.phase,
      storeFiles: st.files,
      completedCount: st.completedCount,
      failedCount: st.failedCount,
      totalCount: st.totalCount,
      position: st.position,
      etaSeconds: st.etaSeconds,
      canceledAtCount: st.canceledAtCount,
      tooLarge: st.tooLarge,
      retryable: st.retryable,
    })),
  );

  // Leaving the surface (unmount, e.g. Start Over or navigating away) keepalive-
  // cancels an in-flight batch on the server, then resets the store (ruling 12).
  useEffect(() => () => usePdfStore.getState().leaveSurface(), []);

  // Accessibility (part 10): on each phase change move focus politely to the new
  // phase's heading (or state pill) so screen reader users hear the state change
  // once. A callback ref tracks whichever heading the current phase renders.
  // tabIndex={-1} makes the non-interactive heading programmatically focusable;
  // a programmatic focus does not trigger :focus-visible, so no ring appears.
  const headingRef = useRef<HTMLElement | null>(null);
  const setHeading = useCallback((el: HTMLElement | null) => {
    headingRef.current = el;
  }, []);
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return; // never steal focus on the initial mount (the entry surface)
    }
    if (phase === 'idle') return;
    headingRef.current?.focus();
  }, [phase]);

  // Consent checkbox ("Don't ask again on this device"), unchecked by default.
  const [remember, setRemember] = useState(false);

  const single = files.length === 1;
  const pdfInputs = useMemo(() => files.map((f) => ({ stem: f.stem, blob: f.blob })), [files]);
  const blobByStem = useMemo(() => new Map(files.map((f) => [f.stem, f.blob])), [files]);
  const sizeByStem = useMemo(() => new Map(files.map((f) => [f.stem, f.blob.size])), [files]);

  if (getConvertApiUrl() === null) return null;

  // Row data per phase. Generation order always, except at the terminal failed
  // phase where failed rows surface to the top keeping their relative order (part 5).
  let listFiles: PdfFile[];
  if (phase === 'idle') {
    listFiles = files.map((f) => ({ stem: f.stem, status: 'waiting' as const }));
  } else if (phase === 'failed') {
    listFiles = [
      ...storeFiles.filter((f) => f.status === 'failed'),
      ...storeFiles.filter((f) => f.status !== 'failed'),
    ];
  } else {
    listFiles = storeFiles;
  }
  // One finished PDF from its list row. Jobs are reported by index in
  // generation order; a job without a download token means the result has
  // expired on the server, same as the batch download.
  const handleDownloadOnePdf = async (stem: string) => {
    const { batchId } = usePdfStore.getState();
    const index = files.findIndex((f) => f.stem === stem);
    if (!batchId || index < 0) return;
    const status = await getStatus(batchId);
    if (status.outcome !== 'ok') return usePdfStore.getState().markResultExpired();
    const job = status.status.jobs.find((j) => j.index === index);
    if (!job?.downloadToken) return usePdfStore.getState().markResultExpired();
    const res = await downloadSinglePdf(job.jobId, job.downloadToken);
    if (res.outcome === 'ok') { triggerDownload(res.blob, `${stem}.pdf`); onAfterFileDownload?.(); }
    else usePdfStore.getState().markResultExpired();
  };

  // Follow scroll (part 5) is active only while converting: the window keeps the
  // frontier visible until the user scrolls, then pauses with a Jump to current pill.
  // At the idle entry the files list with no per-row status: nothing is
  // converting yet, so a column of "Waiting" would only read as something stuck
  // (F8). The status appears the moment Create PDFs starts a batch.
  const list = <FileStatusList files={listFiles} following={phase === 'converting'} showStatus={phase !== 'idle'} onDownloadFile={onDownloadFile} sizeByStem={sizeByStem} onDownloadPdf={(stem) => void handleDownloadOnePdf(stem)} />;

  const handleCreate = () => void usePdfStore.getState().start(pdfInputs);
  const handleCancel = () => void usePdfStore.getState().cancel();
  const handleRetry = () => void usePdfStore.getState().retry();
  const handleConsentConfirm = () => void usePdfStore.getState().confirmConsent(remember);
  const handleConsentDecline = () => usePdfStore.getState().declineConsent();

  const handleDownloadPdfs = async () => {
    const { batchId } = usePdfStore.getState();
    if (!batchId) return;
    if (single) {
      const status = await getStatus(batchId);
      if (status.outcome !== 'ok') return usePdfStore.getState().markResultExpired();
      const job = status.status.jobs[0];
      if (!job?.downloadToken) return usePdfStore.getState().markResultExpired();
      const res = await downloadSinglePdf(job.jobId, job.downloadToken);
      if (res.outcome === 'ok') { triggerDownload(res.blob, `${files[0].stem}.pdf`); onAfterDownload?.(); }
      else usePdfStore.getState().markResultExpired();
      return;
    }
    const res = await downloadResultZip(batchId);
    if (res.outcome === 'ok') { triggerDownload(res.blob, `${baseName || 'documents'}-pdf.zip`); onAfterDownload?.(); }
    else usePdfStore.getState().markResultExpired();
  };

  // Canceled: the server zip holds exactly the completed PDFs (part 7).
  const handleDownloadCanceled = async () => {
    const { batchId } = usePdfStore.getState();
    if (!batchId) return;
    const res = await downloadResultZip(batchId);
    if (res.outcome === 'ok') triggerDownload(res.blob, `${baseName || 'documents'}-pdf.zip`);
    else usePdfStore.getState().markResultExpired();
  };

  // Mixed failure download (part 7): fetch the result zip of the converted PDFs,
  // add each failed file's Word blob under {stem}.docx, regenerate, save.
  const handleDownloadFailed = async () => {
    const { batchId } = usePdfStore.getState();
    if (!batchId) return;
    const res = await downloadResultZip(batchId);
    if (res.outcome !== 'ok') return usePdfStore.getState().markResultExpired();
    const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
    for (const f of storeFiles) {
      if (f.status === 'failed') {
        const blob = blobByStem.get(f.stem);
        if (blob) zip.file(`${f.stem}.docx`, blob);
      }
    }
    const out = await zip.generateAsync({ type: 'blob' });
    triggerDownload(out, `${baseName || 'documents'}-pdf.zip`);
  };

  const cancelButton = (label: string) => (
    <div className={s.row}>
      <button type="button" data-testid="pdf-cancel" className={s.btnOutline} onClick={handleCancel}>
        {label}
      </button>
    </div>
  );

  // Consent gate: shown before anything is sent when consent is not remembered.
  // No request to the converter fires from this phase; only Convert proceeds.
  if (phase === 'consent') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="consent">
        <span className={s.pill}>{t('pdf.consent.badge')}</span>
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>{t('pdf.consent.title')}</h2>
        <p className={s.sub}>{t('pdf.consent.sub')}</p>
        <div className={s.privacy} data-testid="pdf-consent-detail">
          <span className={s.shield}>
            <ConsentShieldGlyph />
          </span>
          <span>{t('pdf.consent.detail')}</span>
        </div>
        <div className={s.optRow}>
          <input
            type="checkbox"
            id="pdf-consent-remember"
            data-testid="pdf-consent-remember"
            className={s.checkbox}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="pdf-consent-remember" className={s.checkLabel}>
            {t('pdf.consent.remember')}
          </label>
        </div>
        <div className={s.row}>
          <button type="button" data-testid="pdf-consent-convert" className={s.btnPrimary} onClick={handleConsentConfirm}>
            {t('pdf.consent.convert')}
          </button>
          <button type="button" data-testid="pdf-consent-decline" className={s.btnOutline} onClick={handleConsentDecline}>
            {t('pdf.consent.keepWord')}
          </button>
        </div>
        <p className={s.micro}>{t('pdf.consent.rememberNote')}</p>
      </div>
    );
  }

  if (phase === 'sending') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="sending">
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>{t('pdf.sending.title')}</h2>
        <p className={s.sub}>
          {single ? t('pdf.sending.sub.one') : t('pdf.sending.sub', { count: String(totalCount) })}
        </p>
        <div className={s.bar}>
          <div data-testid="pdf-bar-fill" data-bar="indeterminate" className={`${s.fill} ${s.fillIndet}`} />
        </div>
        <p className={s.count}>{t('pdf.sending.hint')}</p>
        {cancelButton(t('pdf.cancel.sending'))}
        {list}
      </div>
    );
  }

  if (phase === 'queued') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="queued">
        <span className={s.pill} data-testid="pdf-queued-pill" ref={setHeading} tabIndex={-1}>{t('pdf.queued.pill')}</span>
        <div className={s.big} data-testid="pdf-queued-wait">{coarseWait(etaSeconds)}</div>
        <p className={s.sub}>{tCount(position, 'pdf.queued.sub')}</p>
        {cancelButton(t('pdf.cancel.downloadWord'))}
        <p className={s.micro}>{t('pdf.queued.micro')}</p>
        {list}
      </div>
    );
  }

  if (phase === 'converting') {
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="converting">
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>{t('pdf.converting.title')}</h2>
        <div className={s.bar}>
          <div data-testid="pdf-bar-fill" data-bar="determinate" className={s.fill} style={{ width: `${pct}%` }} />
        </div>
        {/* Aggregate count line as an aria-live polite region (part 10). The text
            changes only when completedCount changes, which is poll-driven at the
            1000ms cadence, so it announces at most once per second. */}
        <div className={s.count} data-testid="pdf-convert-count" aria-live="polite" aria-atomic="true">
          {t('pdf.converting.count', { completed: String(completedCount), total: String(totalCount) })}
        </div>
        <p className={s.hint}>{t('pdf.converting.hint')}</p>
        {cancelButton(t('pdf.cancel.downloadWord'))}
        {list}
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="done">
        <div className={s.checkBig}>
          <Checkmark28Regular />
        </div>
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>
          {single ? t('pdf.done.title.one') : t('pdf.done.title', { count: String(totalCount) })}
        </h2>
        <p className={s.sub}>{single ? t('pdf.done.sub.one') : t('pdf.done.sub')}</p>
        <div className={s.row}>
          <button type="button" data-testid="pdf-download" className={s.btnPrimary} onClick={() => void handleDownloadPdfs()}>
            {single ? t('pdf.done.download.one') : t('pdf.done.download')}
          </button>
          <button type="button" data-testid="pdf-download-word" className={s.btnQuiet} onClick={onDownloadWord}>
            {single ? t('pdf.done.word.one') : t('pdf.done.word')}
          </button>
        </div>
        <p className={s.micro}>{t('pdf.done.micro')}</p>
        {list}
      </div>
    );
  }

  if (phase === 'busy') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="busy">
        <span className={mergeClasses(s.pill, s.pillNeutral)} data-testid="pdf-busy-pill">{t('pdf.busy.pill')}</span>
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>{t('pdf.busy.title')}</h2>
        <p className={s.sub}>{t('pdf.busy.sub')}</p>
        <div className={s.row}>
          <button type="button" data-testid="pdf-word-download" className={s.btnPrimary} onClick={onDownloadWord}>
            {t('pdf.error.downloadWord')}
          </button>
          <button type="button" data-testid="pdf-retry" className={s.btnOutline} onClick={handleRetry}>
            {t('pdf.error.retry')}
          </button>
        </div>
        {list}
      </div>
    );
  }

  if (phase === 'unreachable') {
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="unreachable">
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>
          {tooLarge ? t('pdf.toolarge.title') : t('pdf.unreachable.title')}
        </h2>
        <p className={s.sub}>{tooLarge ? t('pdf.toolarge.sub') : t('pdf.unreachable.sub')}</p>
        <div className={s.row}>
          <button type="button" data-testid="pdf-word-download" className={s.btnPrimary} onClick={onDownloadWord}>
            {t('pdf.error.downloadWord')}
          </button>
          {retryable && (
            <button type="button" data-testid="pdf-retry" className={s.btnOutline} onClick={handleRetry}>
              {t('pdf.error.retry')}
            </button>
          )}
        </div>
        {list}
      </div>
    );
  }

  if (phase === 'canceled') {
    const k = canceledAtCount ?? 0;
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="canceled">
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>{t('pdf.canceled.title')}</h2>
        <p className={s.sub}>
          {k === 0 ? t('pdf.canceled.sub.zero') : tCount(k, 'pdf.canceled.sub')}
        </p>
        <div className={s.row}>
          {k > 0 && (
            <button type="button" data-testid="pdf-canceled-download" className={s.btnPrimary} onClick={() => void handleDownloadCanceled()}>
              {tCount(k, 'pdf.canceled.download')}
            </button>
          )}
          <button type="button" data-testid="pdf-canceled-word" className={s.btnOutline} onClick={onDownloadWord}>
            {tCount(totalCount, 'pdf.canceled.word')}
          </button>
        </div>
        <p className={s.micro}>{t('pdf.canceled.micro')}</p>
        {list}
      </div>
    );
  }

  if (phase === 'failed') {
    const failedStem = storeFiles.find((f) => f.status === 'failed')?.stem ?? '';
    return (
      <div className={s.root} data-testid="pdf-flow" data-phase="failed">
        <div className={s.checkBig}>
          <Checkmark28Regular />
        </div>
        <h2 className={s.heading} ref={setHeading} tabIndex={-1}>
          {single ? t('pdf.failed.title.one') : t('pdf.failed.title', { ok: String(completedCount), total: String(totalCount) })}
        </h2>
        <p className={s.sub}>
          {failedCount === 1
            ? t('pdf.failed.sub.one', { name: failedStem })
            : t('pdf.failed.sub', { count: String(failedCount) })}
        </p>
        <div className={s.row}>
          <button type="button" data-testid="pdf-failed-download" className={s.btnPrimary} onClick={() => void handleDownloadFailed()}>
            {t('pdf.failed.download')}
          </button>
        </div>
        {/* Both counts pluralize independently, e.g. "2 PDFs and 1 Word file" (fix 8). */}
        <p className={s.micro}>
          {t('pdf.failed.micro', {
            pdfs: completedCount === 1
              ? t('pdf.failed.micro.pdfsOne')
              : t('pdf.failed.micro.pdfs', { count: String(completedCount) }),
            words: failedCount === 1
              ? t('pdf.failed.micro.wordsOne')
              : t('pdf.failed.micro.words', { count: String(failedCount) }),
          })}
        </p>
        {list}
      </div>
    );
  }

  // Entry (idle): the existing Word download stays primary and untouched, with
  // Create PDFs beside it, the privacy note beneath, and the list all waiting.
  return (
    <div className={s.root} data-testid="pdf-flow" data-phase="idle">
      <div className={s.row}>
        <button type="button" className={s.btnPrimary} onClick={onDownloadWord}>
          {t('done.downloadAll')}
        </button>
        <button type="button" data-testid="pdf-create" className={s.btnOutline} onClick={handleCreate}>
          {single ? t('pdf.create.one') : t('pdf.create')}
        </button>
      </div>
      <div className={s.privacy} data-testid="pdf-privacy">
        <span className={s.shield}>
          <ShieldGlyph />
        </span>
        <span>{t('pdf.privacy')}</span>
      </div>
      {list}
    </div>
  );
}
