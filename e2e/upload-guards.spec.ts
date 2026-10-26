import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

// Size guards fire BEFORE parsing (a 24 MB document used to freeze the tab
// outright) and upload rejections render inline inside the drop zone,
// persisting until the next attempt. Ships to all users; not flag-gated.
const ON = 'http://localhost:5173';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE_C = path.join(FIXTURES, 'veidne-image-template-C-pretagged.docx');
const DATA_XLSX = path.join(FIXTURES, 'veidne-image-test-data.xlsx');

const MB = 1024 * 1024;
const big = (n: number) => Buffer.alloc(n * MB, 7);

test('a 16 MB document never reaches the parser and explains itself inline', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser).setFiles({ name: 'huge.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: big(16) });

  const error = page.getByTestId('dropzone-error');
  await expect(error).toHaveText('This document is too large to open here. Documents under 15 MB work best.');
  // Still on the upload screen, zone still usable.
  await expect(page.getByText('Drag and drop your Word document or template here')).toBeVisible();
});

test('a 16 MB spreadsheet is rejected the same way', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  let chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser).setFiles(TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();

  chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Excel spreadsheet here').click();
  await (await chooser).setFiles({ name: 'huge.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: big(16) });

  await expect(page.getByTestId('dropzone-error'))
    .toHaveText('This spreadsheet is too large to open here. Spreadsheets under 15 MB work best.');
  await expect(page.getByText('Drag and drop your Excel spreadsheet here')).toBeVisible();
});

test('a 26 MB picture is skipped at intake with its name in the message', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  let chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser).setFiles(TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();
  chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Excel spreadsheet here').click();
  await (await chooser).setFiles(DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();

  await page.getByTestId('image-intake-input').first().setInputFiles([
    { name: 'vacation.jpg', mimeType: 'image/jpeg', buffer: big(26) },
  ]);
  await expect(page.getByText('vacation.jpg is too large. Pictures under 25 MB work best.')).toBeVisible();
});

test('wrong file type renders inside the zone and persists until the next attempt', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });

  const error = page.getByTestId('dropzone-error');
  await expect(error).toHaveText('That is not a Word document. Please choose a .docx file.');
  // Persistent, not a transient toast.
  await page.waitForTimeout(4500);
  await expect(error).toBeVisible();

  // Next valid attempt clears it.
  const chooser2 = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser2).setFiles(TEMPLATE_C);
  await expect(error).toHaveCount(0);
});
