import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';
import { rowStems, grantPdfConsent } from './helpers';

// Item f: failed terminal phase. Proteus: REAL mode. The dev seed corrupts the
// last generated blob so the real converter fails that one job. Assert the
// failed-row styling and tag, surfacing to the top only at the terminal phase,
// the heading, and the mixed zip (ok PDFs + the failed stem as .docx).
function startsWith(buf: Buffer | Uint8Array, sig: string): boolean {
  return Buffer.from(buf.subarray(0, sig.length)).toString('latin1') === sig;
}

test.describe('@real failed', () => {
  test('failed: row styling + tag, terminal surfacing, heading, mixed zip', async ({ page }) => {
    await grantPdfConsent(page); // skip the consent gate; this spec tests the failed terminal phase
    await page.goto('/dev/pdf-done?n=3&corrupt=1');
    await expect(page.getByTestId('pdf-create')).toBeVisible({ timeout: 30_000 });

    // Entry order is generation order; the corrupt file (Doc_3) is last.
    expect(await rowStems(page)).toEqual(['Doc_1', 'Doc_2', 'Doc_3']);

    await page.getByTestId('pdf-create').click();
    const flow = page.getByTestId('pdf-flow');
    await expect(flow).toHaveAttribute('data-phase', 'failed', { timeout: 45_000 });

    // Heading: "{ok} of {total} PDFs ready".
    await expect(flow.getByRole('heading')).toHaveText('2 of 3 PDFs ready');

    // Surfacing: the failed row moves to the top at the terminal phase.
    expect((await rowStems(page))[0]).toBe('Doc_3');

    // Failed-row styling: error status, "Kept as Word" tag, error-tinted row.
    const failedRow = page.locator('[data-stem="Doc_3"]');
    await expect(failedRow).toHaveAttribute('data-status', 'failed');
    await expect(failedRow).toContainText('Kept as Word');
    const bg = await failedRow.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgba(239, 68, 68, 0.12)');

    // Review fix 8: the micro pluralizes both counts independently. With 2 ok and
    // 1 failed it reads "2 PDFs and 1 Word file" (plural PDFs, singular Word file).
    await expect(flow).toContainText('The download contains 2 PDFs and 1 Word file, all with their normal names.');

    await page.screenshot({ path: 'e2e/screenshots/failed.png', fullPage: true });

    // Mixed zip: ok PDFs + the failed file as .docx.
    const zipPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('pdf-failed-download').click();
    const zipDl = await zipPromise;
    expect(zipDl.suggestedFilename()).toBe('Fixtures-pdf.zip');
    const zip = await JSZip.loadAsync(fs.readFileSync(await zipDl.path()));
    expect(Object.keys(zip.files).sort()).toEqual(['Doc_1.pdf', 'Doc_2.pdf', 'Doc_3.docx']);
    expect(startsWith(await zip.files['Doc_1.pdf'].async('uint8array'), '%PDF')).toBe(true);
    expect(startsWith(await zip.files['Doc_2.pdf'].async('uint8array'), '%PDF')).toBe(true);
    // The failed file's Word version is included under its stem.
    expect(zip.files['Doc_3.docx']).toBeTruthy();
  });
});
