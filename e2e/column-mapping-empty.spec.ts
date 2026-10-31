import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { test, expect } from '@playwright/test';

// Work package 2 (journey audit finding 1): when some fields have no matching
// column, the column-matching dialog names them and says they stay blank, the
// button says what happens, and the preview keeps a bar with "Choose columns"
// until every field has a column.
const BASE = 'http://localhost:5181';
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');

// The template has 7 fields: AMOUNT, EURO, NAME, PERCENT, TEXTDATE, TRUEDATE, ZIP.
// This list has columns for NAME and ZIP only, and one column nothing uses.
function writeMismatchList(file: string): void {
  const ws = XLSX.utils.aoa_to_sheet([
    ['NAME', 'ZIP', 'Notes'],
    ['Anna Ozola', 'LV-1010', 'x'],
    ['Jānis Bērziņš', 'LV-1050', 'y'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, file);
}

test('fields without a column are named before generating, and the preview keeps saying so', async ({ page }, testInfo) => {
  const list = testInfo.outputPath('mismatch.xlsx');
  fs.mkdirSync(path.dirname(list), { recursive: true });
  writeMismatchList(list);

  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(list);

  const dialog = page.getByRole('dialog');
  // Parsing the list and opening the dialog can take a while on a slow machine.
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  const banner = dialog.getByText('5 fields have no column and will be empty:');
  await expect(banner).toBeVisible();
  // The names follow the order of the fields in the document.
  await expect(banner).toHaveText('5 fields have no column and will be empty: TRUEDATE, AMOUNT, EURO, PERCENT, TEXTDATE');
  await expect(dialog.getByText('Pick a column for each one below, or they stay blank in 2 documents.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Looks good' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Continue with 5 empty fields' }).click();

  // The preview keeps a bar that does not go away while fields are empty.
  await expect(page.getByText('5 fields have no column: TRUEDATE, AMOUNT, EURO, PERCENT, TEXTDATE')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('blank in all 2 documents')).toBeVisible();
  await page.getByRole('button', { name: 'Choose columns' }).click();
  await expect(page.getByRole('dialog').getByText('5 fields have no column and will be empty:')).toBeVisible();
});

test('when every field has a column the dialog keeps its old wording', async ({ page }) => {
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, 'veidne-format-test-data-lv-dates.xlsx'));
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByRole('button', { name: 'Looks good' })).toBeVisible();
  await expect(dialog.getByText(/have no column/)).toHaveCount(0);
});
