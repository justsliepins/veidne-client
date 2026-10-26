// Direct Proteus API helpers for E2E edge-state setup (node-side, no CORS).
// Proteus mode/config is managed out of band; these only pre-fill / drain / read.
const BASE = 'http://localhost:8085';

/** Post a filler batch of `count` dummy docs straight to the API; returns batchId. */
export async function postFiller(count: number): Promise<string> {
  const form = new FormData();
  for (let i = 0; i < count; i++) {
    form.append('files', new Blob(['filler']), `filler_${i}.docx`);
    form.append('filenames', `filler_${i}`);
  }
  const res = await fetch(`${BASE}/v1/batches`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`filler submit failed: ${res.status}`);
  const body = await res.json();
  return body.batchId as string;
}

export async function cancelBatchApi(batchId: string): Promise<void> {
  try {
    await fetch(`${BASE}/v1/batches/${batchId}/cancel`, { method: 'POST' });
  } catch {
    /* best effort */
  }
}

export async function getBatchApi(batchId: string): Promise<{ status: string } | null> {
  try {
    const res = await fetch(`${BASE}/v1/batches/${batchId}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
