import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';
import { seedDoneOn, convertedCount, rowStatuses } from './helpers';
import { getBatchApi } from './proteus';

// Item e: canceled phase. Proteus: delay mode. Cancel mid-conversion; the tally
// equals the completed count at cancel, the partial zip contains exactly that
// many PDFs, the Word download still works, and the server reports canceled.
test('canceled: tally = completed at cancel, partial zip, Word works, server canceled', async ({ page }) => {
  let batchId = '';
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.url().endsWith('/v1/batches')) {
      try { batchId = (await r.json()).batchId; } catch { /* ignore */ }
    }
  });

  await seedDoneOn(page, 6);
  await page.getByTestId('pdf-create').click();
  const flow = page.getByTestId('pdf-flow');
  await expect(flow).toHaveAttribute('data-phase', 'converting', { timeout: 15_000 });

  // Wait until at least one PDF has completed, then cancel.
  await expect.poll(() => convertedCount(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  await page.getByTestId('pdf-cancel').click();
  await expect(flow).toHaveAttribute('data-phase', 'canceled', { timeout: 10_000 });
  await page.waitForTimeout(500); // let the cancel settle server-side
  await page.screenshot({ path: 'e2e/screenshots/canceled.png', fullPage: true });

  // Tally: the download button reads "Download {k} PDFs"; the sub names k too.
  const dlText = (await page.getByTestId('pdf-canceled-download').textContent()) || '';
  const k = Number(dlText.match(/Download (\d+) PDFs/)?.[1]);
  expect(k).toBeGreaterThanOrEqual(1);
  await expect(flow).toContainText(`${k} PDFs finished before you canceled`);

  // Review fix 5: the canceled list is a frozen, consistent snapshot. No row is
  // still "converting" (no live spinners), and the list's done-count agrees
  // exactly with the heading/button tally k.
  const statuses = await rowStatuses(page);
  expect(statuses).not.toContain('converting');
  expect(statuses.filter((st) => st === 'done').length).toBe(k);

  // Partial zip contains exactly k entries.
  const zipPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByTestId('pdf-canceled-download').click();
  const zipDl = await zipPromise;
  expect(zipDl.suggestedFilename()).toBe('Fixtures-pdf.zip');
  const zip = await JSZip.loadAsync(fs.readFileSync(await zipDl.path()));
  expect(Object.keys(zip.files).length).toBe(k);

  // Word download still works (the existing local path).
  const wordPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByTestId('pdf-canceled-word').click();
  const wordDl = await wordPromise;
  expect(wordDl.suggestedFilename()).toBe('Fixtures.zip');

  // Server reports the batch canceled.
  const server = await getBatchApi(batchId);
  expect(server?.status).toBe('canceled');
});
