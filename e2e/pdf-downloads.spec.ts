import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';
import { seedDoneOn } from './helpers';

// Items e (single-document bare .pdf) and f (multi-file result zip + unchanged
// Word zip). These assert real converter output, so they need Proteus in REAL
// mode. Run with: playwright test --grep @real  (after removing CONVERTER_MODE).

function startsWith(buf: Buffer | Uint8Array, sig: string): boolean {
  return Buffer.from(buf.subarray(0, sig.length)).toString('latin1') === sig;
}

test.describe('@real downloads', () => {
  test('e: single document downloads a bare .pdf named after the stem', async ({ page }) => {
    await seedDoneOn(page, 1);
    await expect(page.getByTestId('pdf-create')).toHaveText('Create PDF'); // singular

    await page.getByTestId('pdf-create').click();
    await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pdf-download')).toHaveText('Download PDF'); // singular
    await page.screenshot({ path: 'e2e/screenshots/e-single-done.png', fullPage: true });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('pdf-download').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Doc_1.pdf');
    const buf = fs.readFileSync(await download.path());
    expect(startsWith(buf, '%PDF')).toBe(true);
  });

  test('f: multi-file downloads <baseName>-pdf.zip with matching stems; Word zip unchanged', async ({ page }) => {
    await seedDoneOn(page, 3);
    await page.getByTestId('pdf-create').click();
    await expect(page.getByRole('heading', { name: '3 PDFs ready' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'e2e/screenshots/f-multi-done.png', fullPage: true });

    // Download PDFs -> result zip
    const pdfZipPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('pdf-download').click();
    const pdfZipDl = await pdfZipPromise;
    expect(pdfZipDl.suggestedFilename()).toBe('Fixtures-pdf.zip');

    const pdfZip = await JSZip.loadAsync(fs.readFileSync(await pdfZipDl.path()));
    const pdfNames = Object.keys(pdfZip.files).sort();
    expect(pdfNames).toEqual(['Doc_1.pdf', 'Doc_2.pdf', 'Doc_3.pdf']);
    for (const name of pdfNames) {
      const bytes = await pdfZip.files[name].async('uint8array');
      expect(startsWith(bytes, '%PDF'), `${name} is a PDF`).toBe(true);
    }

    // Download Word files too -> the existing Word zip, unchanged
    const wordZipPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('pdf-download-word').click();
    const wordZipDl = await wordZipPromise;
    expect(wordZipDl.suggestedFilename()).toBe('Fixtures.zip');

    const wordZip = await JSZip.loadAsync(fs.readFileSync(await wordZipDl.path()));
    const wordNames = Object.keys(wordZip.files).sort();
    expect(wordNames).toEqual(['Doc_1.docx', 'Doc_2.docx', 'Doc_3.docx']);
    for (const name of wordNames) {
      const bytes = await wordZip.files[name].async('uint8array');
      expect(startsWith(bytes, 'PK'), `${name} is a docx (zip)`).toBe(true);
    }
  });
});
