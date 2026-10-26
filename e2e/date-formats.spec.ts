import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';

// UI regression spec for Latvian dot-date formats (dd.mm.yyyy): the lv-dates
// fixture used to surface raw serials ("45710") in the merged preview and the
// generated documents. Same flow and servers as preview-punctuation.spec.ts.
const BASE = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const DATA = path.join(FIXTURES, 'veidne-format-test-data-lv-dates.xlsx');

async function normalizedText(page: Page, testId: string): Promise<string> {
  const raw = await page.getByTestId(testId).innerText();
  return raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
}

async function expectInBothPreviews(page: Page, sub: string): Promise<void> {
  await expect
    .poll(() => normalizedText(page, 'document-area'), { message: `main merged preview should contain: ${sub}` })
    .toContain(sub);
  await expect
    .poll(() => normalizedText(page, 'preview-panel-doc'), { message: `side preview panel should contain: ${sub}` })
    .toContain(sub);
}

test('lv dot-dates render in the merged preview and generated documents', async ({ page }) => {
  // Template + Data flow with the lv-dates spreadsheet.
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(DATA);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // Record 1: dd.mm.yyyy, not the raw serial 45710.
  await expectInBothPreviews(page, 'Riga, 22.02.2025');
  await expectInBothPreviews(page, 'Confirmed on 22.02.2025');

  // Records 2 and 3.
  await page.getByText('1 of 3', { exact: true }).locator('..').locator('button').nth(1).click();
  await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
  await expectInBothPreviews(page, '05.03.2025');
  await page.getByText('2 of 3', { exact: true }).locator('..').locator('button').nth(1).click();
  await expect(page.getByText('3 of 3', { exact: true })).toBeVisible();
  await expectInBothPreviews(page, '31.12.2025');

  // Generate; name files by NAME so record 1 is Anna_Ozola.docx, then unzip it.
  await page.getByLabel('Name files by').click();
  await page.getByRole('option', { name: 'NAME' }).click();
  await expect(page.getByText('Anna_Ozola.docx', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByText('Anna_Ozola.docx', { exact: true }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Anna_Ozola.docx');

  const docx = await JSZip.loadAsync(fs.readFileSync((await download.path())!));
  const xml = await docx.file('word/document.xml')!.async('string');
  const docText = Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
  expect(docText).toContain('Riga, 22.02.2025');
});
