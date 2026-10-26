/**
 * The only module that speaks HTTP to the Proteus PDF conversion service.
 *
 * Two hard rules from the spec live here:
 *  - getConvertApiUrl() is the SOLE reader of VITE_CONVERT_API_URL (part 2). When
 *    it returns null the entire PDF feature renders nothing and makes no calls,
 *    so the production build with the variable unset is byte-for-byte today.
 *  - Every function maps failures into a typed outcome, never a thrown string
 *    (part 3). The UI never sees a raw fetch error.
 *
 * SSE is out of scope; the store polls getStatus (part 4).
 */

/** Sole reader of the converter URL. null means the feature is off. */
export function getConvertApiUrl(): string | null {
  const raw = import.meta.env.VITE_CONVERT_API_URL;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

/** One document to convert: its desired output stem (no extension) and the Word blob. */
export interface PdfInputFile {
  stem: string;
  blob: Blob;
}

// --- submit ----------------------------------------------------------------

export type SubmitResult =
  | { outcome: 'accepted'; batchId: string; totalJobs: number }
  | { outcome: 'busy'; retryAfterSeconds: number | null }
  | { outcome: 'tooLarge' }
  | { outcome: 'unreachable' };

// --- status ----------------------------------------------------------------

/** Per-job status values as the server reports them. */
export type ServerJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';
/** Batch status values as the server reports them. */
export type ServerBatchStatus = 'queued' | 'running' | 'completed' | 'canceled' | 'failed';

export interface BatchJob {
  jobId: string;
  index: number;
  filename: string;
  status: ServerJobStatus;
  downloadToken?: string;
}

export interface BatchStatusData {
  batchId: string;
  status: ServerBatchStatus;
  totalJobs: number;
  completed: number;
  failed: number;
  canceled: number;
  position: number;
  etaSeconds: number;
  jobs: BatchJob[];
}

export type StatusResult =
  | { outcome: 'ok'; status: BatchStatusData }
  | { outcome: 'notFound' }
  | { outcome: 'unreachable' };

// --- cancel ----------------------------------------------------------------

export type CancelResult =
  | { outcome: 'ok'; completed: number; canceled: number }
  | { outcome: 'notFound' }
  | { outcome: 'unreachable' };

// --- downloads -------------------------------------------------------------

export type BlobResult =
  | { outcome: 'ok'; blob: Blob }
  | { outcome: 'notFound' }
  | { outcome: 'unreachable' };

/**
 * POST {base}/v1/batches. Multipart, one file part per document plus a parallel
 * `filenames` field carrying each desired output stem, in the same order.
 */
export async function submitBatch(files: PdfInputFile[]): Promise<SubmitResult> {
  const base = getConvertApiUrl();
  if (!base) return { outcome: 'unreachable' };

  const form = new FormData();
  for (const f of files) {
    form.append('files', f.blob, `${f.stem}.docx`);
    form.append('filenames', f.stem);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/v1/batches`, { method: 'POST', body: form });
  } catch {
    return { outcome: 'unreachable' };
  }

  if (res.status === 429) {
    return { outcome: 'busy', retryAfterSeconds: await readRetryAfter(res) };
  }
  if (res.status === 413) return { outcome: 'tooLarge' };
  if (!res.ok) return { outcome: 'unreachable' };

  const body = await safeJson(res);
  if (body && typeof body.batchId === 'string' && typeof body.totalJobs === 'number') {
    return { outcome: 'accepted', batchId: body.batchId, totalJobs: body.totalJobs };
  }
  return { outcome: 'unreachable' };
}

/** GET {base}/v1/batches/{batchId}. */
export async function getStatus(batchId: string): Promise<StatusResult> {
  const base = getConvertApiUrl();
  if (!base) return { outcome: 'unreachable' };

  let res: Response;
  try {
    res = await fetch(`${base}/v1/batches/${encodeURIComponent(batchId)}`);
  } catch {
    return { outcome: 'unreachable' };
  }

  if (res.status === 404) return { outcome: 'notFound' };
  if (!res.ok) return { outcome: 'unreachable' };

  const body = await safeJson(res);
  if (!body || typeof body.batchId !== 'string' || !Array.isArray(body.jobs)) {
    return { outcome: 'unreachable' };
  }
  return { outcome: 'ok', status: body as BatchStatusData };
}

/**
 * POST {base}/v1/batches/{batchId}/cancel. With keepalive it survives page
 * unload so an abandoned conversion still frees server slots.
 */
export async function cancelBatch(
  batchId: string,
  opts?: { keepalive?: boolean },
): Promise<CancelResult> {
  const base = getConvertApiUrl();
  if (!base) return { outcome: 'unreachable' };

  let res: Response;
  try {
    res = await fetch(`${base}/v1/batches/${encodeURIComponent(batchId)}/cancel`, {
      method: 'POST',
      keepalive: opts?.keepalive ?? false,
    });
  } catch {
    return { outcome: 'unreachable' };
  }

  if (res.status === 404) return { outcome: 'notFound' };
  if (!res.ok) return { outcome: 'unreachable' };

  const body = await safeJson(res);
  return {
    outcome: 'ok',
    completed: toCount(body?.completed),
    canceled: toCount(body?.canceled),
  };
}

/** GET {base}/v1/batches/{batchId}/result.zip. */
export async function downloadResultZip(batchId: string): Promise<BlobResult> {
  return fetchBlob(`/v1/batches/${encodeURIComponent(batchId)}/result.zip`);
}

/** GET {base}/v1/jobs/{jobId}/result?token=... for the single-document case. */
export async function downloadSinglePdf(jobId: string, token: string): Promise<BlobResult> {
  return fetchBlob(`/v1/jobs/${encodeURIComponent(jobId)}/result?token=${encodeURIComponent(token)}`);
}

// --- internals -------------------------------------------------------------

async function fetchBlob(path: string): Promise<BlobResult> {
  const base = getConvertApiUrl();
  if (!base) return { outcome: 'unreachable' };

  let res: Response;
  try {
    res = await fetch(`${base}${path}`);
  } catch {
    return { outcome: 'unreachable' };
  }

  if (res.status === 404) return { outcome: 'notFound' };
  if (!res.ok) return { outcome: 'unreachable' };

  try {
    return { outcome: 'ok', blob: await res.blob() };
  } catch {
    return { outcome: 'unreachable' };
  }
}

/** Prefer the JSON body's retryAfterSeconds, fall back to the Retry-After header. */
async function readRetryAfter(res: Response): Promise<number | null> {
  const body = await safeJson(res);
  if (body && typeof body.retryAfterSeconds === 'number') return body.retryAfterSeconds;
  const header = res.headers.get('retry-after');
  if (header) {
    const n = Number(header);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
