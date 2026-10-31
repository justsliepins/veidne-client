import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';

// Work package 5 (journey audit finding 9): generated Word files and the zip
// are DEFLATE-compressed. Each entry's compression method is read from the
// zip central directory: 0 means stored (what main produces), 8 means DEFLATE.
const BASE = 'http://localhost:5181';

/** Name and compression method of every entry, from the central directory (PK 01 02). */
function entries(bytes: Uint8Array): { name: string; method: number }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: { name: string; method: number }[] = [];
  for (let i = 0; i + 46 <= bytes.length; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(i + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + nameLength));
    out.push({ name, method: view.getUint16(i + 10, true) });
  }
  return out;
}

test('every generated .docx in the zip is compressed', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('veidne_askDeclinedAt', String(Date.now())); } catch { /* ignore */ }
  });
  await page.goto(`${BASE}/dev/pdf-done?n=3`);
  const button = page.getByRole('button', { name: 'Download Word files' });
  await expect(button).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  const download = await downloadPromise;
  const outer = new Uint8Array(fs.readFileSync(await download.path()));
  const outerEntries = entries(outer);
  expect(outerEntries.length).toBe(3);
  expect(outerEntries.every((e) => e.method === 8), 'zip entries use DEFLATE').toBe(true);
  const zip = await JSZip.loadAsync(outer);
  const docs = Object.values(zip.files).filter((f) => f.name.endsWith('.docx'));
  expect(docs.length).toBe(3);
  for (const entry of docs) {
    // The part the generator rewrites is compressed. Parts copied unchanged from
    // the template keep the template's own method (Word saves them compressed).
    const body = entries(await entry.async('uint8array')).find((e) => e.name === 'word/document.xml');
    expect(body?.method, `${entry.name}: word/document.xml uses DEFLATE`).toBe(8);
  }
});
