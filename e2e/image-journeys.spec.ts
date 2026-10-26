import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { test, expect, type Page } from '@playwright/test';

// Human journeys for image fields (flag on). These drive the app exactly as
// a person does: visible drop zones via the file chooser, the only obvious
// button at each step, no store shortcuts. They exist because the component
// suite was green while the real flow was broken: a user could create an
// image field and then be asked for the spreadsheet again, or never see the
// pictures intake at all. Every journey asserts the core invariants: no step
// re-asks for a file already provided, and picture intake is reachable
// whenever an image field exists.
const ON = 'http://localhost:5173';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE_A = path.join(FIXTURES, 'veidne-image-template-A-untagged.docx');
const TEMPLATE_C = path.join(FIXTURES, 'veidne-image-template-C-pretagged.docx');
const DATA_XLSX = path.join(FIXTURES, 'veidne-image-test-data.xlsx');
const IMAGES_ZIP = path.join(FIXTURES, 'images.zip');

async function uploadDocByClick(page: Page, file: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Word document or template here').click();
  await (await chooser).setFiles(file);
}

async function uploadXlsxByClick(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop your Excel spreadsheet here').click();
  await (await chooser).setFiles(file as string);
}

async function tagPhoto(page: Page) {
  await page.getByTestId('doc-image-button').click();
  await page.locator('#image-field-name').fill('PHOTO');
  await page.getByRole('button', { name: 'Create field' }).click();
  // With rows already loaded the app routes straight to the guided Pictures
  // step; otherwise the badge appears on the Fields step.
  await expect(page.getByTestId('image-badge')
    .or(page.getByRole('heading', { name: 'Add the pictures' })).first()).toBeVisible();
}

function xlsxOf(rows: Record<string, string>[]): { name: string; mimeType: string; buffer: Buffer } {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  return {
    name: 'replacement.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  };
}

test('J1 owner order: template, tag picture, data, pictures, generate', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_A);
  await tagPhoto(page);

  await page.getByRole('button', { name: 'Add your data' }).click();
  // The Data step shows BOTH the spreadsheet drop zone and the pictures card.
  await expect(page.getByText('Drag and drop your Excel spreadsheet here')).toBeVisible();
  await expect(page.getByTestId('image-intake').first()).toBeVisible();

  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();

  // The guided Pictures step appears right after Apply.
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await expect(page.getByText('Your PHOTO column names 7 pictures. Add the image files and each row gets its photo.')).toBeVisible();
  // Chips list the distinct expected names from the actual cells: six
  // distinct values, so five chips plus the +1 more tail.
  const chips = page.getByTestId('pictures-chips');
  for (const name of ['anna.jpg', 'janis.jpg', 'zaklina', 'bigphoto.webp', 'petra.gif']) {
    await expect(chips).toContainText(name);
  }
  await expect(chips).toContainText('+1 more');
  // Zero images: the primary reads Continue without pictures.
  await expect(page.getByRole('button', { name: 'Continue without pictures' })).toBeVisible();

  // Adding the zip flips the coverage line and the button label.
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await expect(page.getByTestId('image-match-panel').first()).toContainText('6 of 7 rows have a picture.');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
});

test('J2 Excel first, tag later: the late field still binds its column', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_A);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  await page.getByText('Back to Fields').click();
  await tagPhoto(page);

  // Creating the field with rows loaded routes straight to the Pictures step.
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  // The PHOTO column joined the mapping even though the field came after it.
  await expect(page.getByTestId('image-match-panel').first()).toContainText('6 of 7 rows have a picture.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
});

test('J3 pre-tagged template: pictures can come before the spreadsheet', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();

  // Pictures first, data second.
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await expect(page.getByText('6 pictures added.', { exact: true })).toBeVisible();
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('image-rail-summary')).toContainText('6 of 7 rows have a picture.');
});

test('J4 back and forward never re-asks for the spreadsheet', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_A);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  await page.getByText('Back to Fields').click();
  await tagPhoto(page);

  // The guided step fires once; the user skips it.
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue without pictures' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
  // Rail guidance wording while pictures are still missing.
  await expect(page.getByTestId('image-rail-summary')).toContainText('No pictures yet. 7 rows expect one, like anna.jpg.');
  await expect(page.getByTestId('image-rail-summary').getByRole('button', { name: 'Add pictures' })).toBeVisible();

  // Stepper back and forward: no re-trigger, no re-asking for the file.
  await page.getByText('Back to Fields').click();
  const forward = page.getByRole('button', { name: 'Back to preview' });
  await expect(forward).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add your data' })).toHaveCount(0);
  await forward.click();

  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toHaveCount(0);
  await expect(page.getByText('Drag and drop your Excel spreadsheet here')).toHaveCount(0);
});

test('J5 document-only entry: intake visible on the bridge before any data', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=document-only`);
  await uploadDocByClick(page, TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();

  // The bridge offers the spreadsheet choices AND the pictures card.
  await expect(page.getByText('I have a spreadsheet')).toBeVisible();
  const card = page.getByTestId('image-intake').first();
  await expect(card).toBeVisible();
  // Before a spreadsheet the card is pre-collapsed to its heading; expand it first.
  await card.getByTestId('image-intake-toggle').click();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await expect(card.getByText('6 pictures added.', { exact: true })).toBeVisible();
});

test('J6 replacing the spreadsheet keeps pictures, drops stale row choices', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // Manual choice for row 7, then replace the data outright.
  await page.getByTestId('image-rail-summary').getByRole('button', { name: 'Add more images' }).click();
  await page.getByTestId('image-match-panel').first().locator('select').first().selectOption('');
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(page.getByText('Drag and drop your Excel spreadsheet here')).toBeVisible();
  await uploadXlsxByClick(page, xlsxOf([
    { NAME: 'Otto Ozols', COURSE: 'X', DATE: '2026-06-12', PHOTO: 'petra.gif' },
    { NAME: 'New Person', COURSE: 'X', DATE: '2026-06-12', PHOTO: 'nope.jpg' },
  ]));
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // Pictures survived; the stale manual skip did not; coverage recomputed.
  await expect(page.getByTestId('image-rail-summary')).toContainText('1 of 2 rows have a picture.');
  await page.getByTestId('image-rail-summary').getByRole('button', { name: 'Add more images' }).click();
  const panel = page.getByTestId('image-match-panel').first();
  await expect(panel).toContainText('Row 2 expects nope.jpg, but no file with that name was added.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
});

test('J7 deleting the image field removes every pictures surface', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_C);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  await page.getByText('Back to Fields').click();
  // Reveal the row actions by hovering the sidebar field row, not the document
  // badge (which the bare name now also shows): the delete button lives there.
  await page.locator('div:has(> [data-row-actions])').filter({ hasText: 'PHOTO' }).hover();
  await page.getByRole('button', { name: 'Delete field PHOTO' }).click();
  await expect(page.getByTestId('image-badge')).toHaveCount(0);

  await page.getByRole('button', { name: 'Back to preview' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
  await expect(page.getByTestId('image-rail-summary')).toHaveCount(0);
  await expect(page.getByTestId('image-intake')).toHaveCount(0);
});


test('image-free flow: no pictures screen, route, or string is reachable', async ({ page }) => {
  await page.goto(`${ON}/editor?flow=template-data`);
  const TEXT_TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
  const TEXT_DATA = path.join(FIXTURES, 'veidne-format-test-data.xlsx');
  await uploadDocByClick(page, TEXT_TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await uploadXlsxByClick(page, TEXT_DATA);
  await page.getByRole('button', { name: 'Looks good' }).click();

  // Straight to the preview: no guided step, no guidance strings, no rail.
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toHaveCount(0);
  await expect(page.getByText('Continue without pictures')).toHaveCount(0);
  await expect(page.getByText(/rows expect one/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add pictures' })).toHaveCount(0);
  await expect(page.getByTestId('image-rail-summary')).toHaveCount(0);
});

test('375 px journey: upload to generate end to end on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${ON}/editor?flow=template-data`);
  await uploadDocByClick(page, TEMPLATE_C);

  // The fixed mobile bar is the forward path the sidebar used to hide.
  await page.getByRole('button', { name: 'Add your data' }).click();
  await expect(page.getByText('Drag and drop your Excel spreadsheet here')).toBeVisible();
  await uploadXlsxByClick(page, DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();

  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
});
