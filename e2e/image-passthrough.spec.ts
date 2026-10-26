import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { test, expect } from '@playwright/test';

// Image passthrough regression (Task 10): the owner fixture carries a logo
// drawing in its own run AND a drawing sharing a run with the word
// Confidential, the exact case mergeAdjacentRuns used to destroy. The full
// real flow (upload, auto-detected {{NAME}}, one data row, generate,
// download) must keep both media entries byte-identical, both w:drawing
// elements, the rels, and the Confidential run's own drawing. Guards the
// additive-only invariant: what Veidne does not understand it must pass
// through untouched.
const BASE = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-image-template-B-passthrough.docx');

const MEDIA_1 = 'word/media/66945be25feadc8a3eff18a0349cc760b835a013.png';
const MEDIA_2 = 'word/media/4c68be01d9e9c0089384bb52781b0407f540acfc.png';

function oneRowWorkbook(): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ NAME: 'Anna Ozola' }]), 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

test('pictures and their rels survive tagging and generation byte-intact', async ({ page }) => {
  const sourceZip = await JSZip.loadAsync(readFileSync(TEMPLATE));
  const srcMedia1 = await sourceZip.file(MEDIA_1)!.async('nodebuffer');
  const srcMedia2 = await sourceZip.file(MEDIA_2)!.async('nodebuffer');

  await page.goto(`${BASE}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);

  // {{NAME}} auto-detects from the template text; go straight to data with
  // a single row.
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'one-row.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: oneRowWorkbook(),
  });
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByText('Anna_Ozola.docx', { exact: true }).first().click();
  const download = await downloadPromise;
  const out = await JSZip.loadAsync(readFileSync((await download.path())!));

  // Both media entries survive byte-identical.
  const outMedia1 = out.file(MEDIA_1);
  const outMedia2 = out.file(MEDIA_2);
  expect(outMedia1, `${MEDIA_1} missing from output`).toBeTruthy();
  expect(outMedia2, `${MEDIA_2} missing from output`).toBeTruthy();
  expect(Buffer.compare(await outMedia1!.async('nodebuffer'), srcMedia1)).toBe(0);
  expect(Buffer.compare(await outMedia2!.async('nodebuffer'), srcMedia2)).toBe(0);

  // Both drawings survive, and the run holding Confidential still contains
  // its drawing (the exact case the old merge destroyed).
  const docXml = await out.file('word/document.xml')!.async('string');
  expect((docXml.match(/<w:drawing/g) ?? []).length).toBe(2);
  expect(docXml).toMatch(/<w:r[^>]*>(?:(?!<\/w:r>)[\s\S])*?Confidential(?:(?!<\/w:r>)[\s\S])*?<w:drawing/);

  // Relationship entries intact.
  const rels = await out.file('word/_rels/document.xml.rels')!.async('string');
  expect(rels).toContain('Target="media/66945be25feadc8a3eff18a0349cc760b835a013.png"');
  expect(rels).toContain('Target="media/4c68be01d9e9c0089384bb52781b0407f540acfc.png"');

  // The text placeholder filled with the row value, no tag residue.
  expect(docXml).toContain('Anna Ozola');
  expect(docXml).not.toContain('{{NAME}}');
});
