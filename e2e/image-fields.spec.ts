import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';

// Image fields, Tasks 11 and 12, behind the imagePlaceholders dark-launch
// flag. The feature-on dev server (:5173, .env.development sets
// VITE_IMAGE_FIELDS=true) exercises rendering, click-to-tag, round trip, and
// auto-detection with the owner fixtures; the darklaunch server (:5181, flag
// off) must show none of it. The legacy gated specs all run against :5181 and
// double as the flag-off regression net.
const ON = 'http://localhost:5173';
const OFF = 'http://localhost:5181';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE_A = path.join(FIXTURES, 'veidne-image-template-A-untagged.docx');
const TEMPLATE_C = path.join(FIXTURES, 'veidne-image-template-C-pretagged.docx');
const TEXT_TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');

async function trackObjectUrls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stats = { created: 0, revoked: 0 };
    (window as unknown as { __urlStats: typeof stats }).__urlStats = stats;
    const origCreate = URL.createObjectURL.bind(URL);
    const origRevoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => { stats.created++; return origCreate(obj); };
    URL.revokeObjectURL = (url: string) => { stats.revoked++; origRevoke(url); };
  });
}

test('flag on: template A renders its sample picture at extent size', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_A);
  await expect(page.getByTestId('document-area')).toBeVisible();

  const img = page.getByTestId('doc-image');
  await expect(img).toHaveCount(1);
  await expect(img).toBeVisible();
  // A's drawing extent is 1047750 x 1323975 EMU: about 110 x 139 px.
  const box = await img.boundingBox();
  expect(box!.width).toBeGreaterThan(95);
  expect(box!.width).toBeLessThan(125);
  const natural = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(natural).toBeGreaterThan(0);
});

test('flag on: click-tag flow, badge, sidebar, descr in download, round trip', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_A);
  await expect(page.getByTestId('doc-image')).toHaveCount(1);

  // The Image field dialog, exact copy from the wireframe.
  await page.getByTestId('doc-image-button').click();
  await expect(page.getByRole('heading', { name: 'Image field' })).toBeVisible();
  await expect(page.getByText('Field name', { exact: true })).toBeVisible();
  await expect(page.getByText(/Every generated document gets its own picture, sized and placed exactly like this sample\./)).toBeVisible();
  await expect(page.getByText(/column to your spreadsheet with each picture's file name, for example anna\.jpg\./)).toBeVisible();

  await page.locator('#image-field-name').fill('PHOTO');
  await page.getByRole('button', { name: 'Create field' }).click();

  // Badge on the picture, sidebar entry with the image suffix.
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await expect(page.getByText('image', { exact: true }).first()).toBeVisible();

  // The downloaded template carries descr="{{PHOTO}}".
  await page.getByRole('button', { name: 'Download' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Template/ }).click();
  const download = await downloadPromise;
  const taggedBytes = readFileSync((await download.path())!);
  const docXml = await (await JSZip.loadAsync(taggedBytes)).file('word/document.xml')!.async('string');
  expect(docXml).toContain('descr="{{PHOTO}}"');

  // Re-uploading the download recreates the field with no clicks.
  await page.goto(`${ON}/editor?flow=template-data`);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'tagged-roundtrip.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: taggedBytes,
  });
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await expect(page.getByText('image', { exact: true }).first()).toBeVisible();
});

test('flag on: template C auto-detects PHOTO with no clicks', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);

  await expect(page.getByTestId('image-badge')).toBeVisible();
  await expect(page.getByText('image', { exact: true }).first()).toBeVisible();
  // The text placeholders detected alongside it.
  await expect(page.getByText('NAME', { exact: true }).first()).toBeVisible();
});

test('flag on: clicking the tagged picture offers Remove field', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();

  await page.getByTestId('doc-image-button').click();
  await page.getByRole('button', { name: 'Remove field' }).click();
  await expect(page.getByTestId('image-badge')).toHaveCount(0);
});

test('flag on: a persisted session without the type property loads as text', async ({ page }) => {
  const rawDocxBase64 = readFileSync(TEXT_TEMPLATE).toString('base64');
  await page.addInitScript(({ b64 }) => {
    localStorage.setItem('veidne_session', JSON.stringify({
      sourceFileName: 'old-project.docx',
      documentHtml: '',
      rawDocxBase64: b64,
      // Saved before the image type existed: no type property anywhere.
      placeholders: [{ id: 'ph-1', name: 'NAME', originalText: '{{NAME}}', colorIndex: 0, occurrences: [] }],
      editorPhase: 'placeholders',
      dataSubState: 'bridge',
      kitDownloaded: false,
      savedAt: Date.now(),
    }));
  }, { b64: rawDocxBase64 });

  await page.goto(`${ON}/editor`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText('NAME', { exact: true }).first()).toBeVisible();
  // No image suffix anywhere: the restored field behaves as text.
  await expect(page.getByText('image', { exact: true })).toHaveCount(0);
});

test('flag on: object URLs are revoked across repeated uploads', async ({ page }) => {
  await trackObjectUrls(page);
  await page.goto(`${ON}/editor?flow=template-data`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_A);
  await expect(page.getByTestId('doc-image')).toHaveCount(1);

  // SPA round trip (logo, then the hero CTA) so the counters survive; the
  // editor's unsaved-work confirm is accepted.
  page.on('dialog', (dialog) => void dialog.accept());
  await page.locator('a[href="/"]').first().click();
  await page.getByRole('link', { name: 'Start with your document' }).click();
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_A);
  await expect(page.getByTestId('doc-image')).toHaveCount(1);

  const stats = await page.evaluate(() =>
    (window as unknown as { __urlStats: { created: number; revoked: number } }).__urlStats);
  expect(stats.created).toBeGreaterThanOrEqual(2);
  // Only the live document's single URL may remain unrevoked.
  expect(stats.created - stats.revoked).toBe(1);
});

test('flag off: template C renders no picture and creates no image field', async ({ page }) => {
  await page.goto(`${OFF}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('document-area')).toBeVisible();

  // No image token, no badge, no image field: pre-Task-11 behavior.
  await expect(page.getByTestId('doc-image')).toHaveCount(0);
  await expect(page.getByTestId('image-badge')).toHaveCount(0);
  await expect(page.getByText('image', { exact: true })).toHaveCount(0);
  // Text placeholders still auto-detect as always.
  await expect(page.getByText('NAME', { exact: true }).first()).toBeVisible();
});

// ── Task 13: image intake and matching (flag on, owner fixtures) ───────────

const DATA_XLSX = path.join(FIXTURES, 'veidne-image-test-data.xlsx');
const IMAGES_ZIP = path.join(FIXTURES, 'images.zip');
const TEMPLATE_B = path.join(FIXTURES, 'veidne-image-template-B-passthrough.docx');
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

interface CapturedEvent { event: string; data?: Record<string, unknown> }

async function captureAnalytics(page: Page): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  await page.route('**/api/analytics', async (route) => {
    events.push(route.request().postDataJSON() as CapturedEvent);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return events;
}

/** On the Generate step the full panel lives behind the rail summary's Add
 *  more images dialog. */
async function openRailPanel(page: Page) {
  // The action reads Add pictures while none are loaded, Add more images after.
  await page.getByTestId('image-rail-summary').getByRole('button', { name: /Add pictures|Add more images/ }).click();
  await expect(page.getByTestId('image-intake').first()).toBeVisible();
}

/** Dismiss the guided Pictures step when it fires (first needsPictures
 *  transition of the session). */
async function skipPicturesStep(page: Page) {
  await page.getByRole('button', { name: 'Continue without pictures' }).click();
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toHaveCount(0);
}

async function closeRailPanel(page: Page) {
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('image-intake')).toHaveCount(0);
}

/** Template C (auto PHOTO field) plus the owner 7-row data file, to preview. */
async function toPreviewWithData(page: Page) {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])').setInputFiles(DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  // The guided Pictures step fires on this transition; these component tests
  // exercise the surfaces behind it.
  await skipPicturesStep(page);
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
}

test('flag on: the Pictures card shows the exact copy on the Data step', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Add your data' }).click();
  const card = page.getByTestId('image-intake').first();
  // The heading shows on the pre-collapsed card; expand it for the rest of the copy.
  await expect(card).toContainText('Pictures for your PHOTO column');
  await card.getByTestId('image-intake-toggle').click();
  await expect(card).toContainText('Drop image files, a folder, or a .zip here');
  await expect(card.getByRole('button', { name: 'Choose images' })).toBeVisible();
  await expect(card).toContainText('JPG, PNG, WEBP, GIF, matched to your PHOTO column by file name.');
});

test('flag on: HEIC is rejected with the exact message', async ({ page }) => {
  await toPreviewWithData(page);
  await openRailPanel(page);
  await page.getByTestId('image-intake-input').first().setInputFiles([
    { name: 'photo.heic', mimeType: 'image/heic', buffer: Buffer.from([0]) },
  ]);
  await expect(page.getByText(
    'HEIC photos are not supported yet. Convert them to JPG, or on iPhone set Camera capture to Most Compatible.',
    { exact: true },
  )).toBeVisible();
});

test('flag on: the owner zip hits every planted trap', async ({ page }) => {
  await toPreviewWithData(page);
  // Plural banner copy on the 7-row flow.
  await expect(page.getByText('Data loaded · 7 rows · 4 fields each · Previewing document 1 of 7')).toBeVisible({ timeout: 10_000 });
  await openRailPanel(page);
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);

  const panel = page.getByTestId('image-match-panel').first();
  // 6 of 7: row 2 matches janis.JPG case-insensitively, row 3 matches
  // zaklina with no extension, row 6 matches despite its trailing space and
  // shares anna.jpg with row 1.
  await expect(panel).toContainText('6 of 7 rows have a picture.');
  // Only row 7 is flagged, for the genuinely missing martins.jpg.
  await expect(panel.locator('select')).toHaveCount(1);
  await expect(panel).toContainText('Row 7 expects martins.jpg, but no file with that name was added.');
  // IMG_0042.jpg is the one unreferenced file.
  await expect(panel).toContainText('1 added file has no matching row and will be skipped.');

  // Collapsed card: drop zone hidden behind the check summary once pictures
  // exist; Add more images reopens the drop target.
  const card = page.getByTestId('image-intake').first();
  await expect(card.getByTestId('image-intake-collapsed')).toBeVisible();
  await expect(card.getByText('6 pictures added.', { exact: true })).toBeVisible();
  await expect(card.getByText('Drop image files, a folder, or a .zip here')).toHaveCount(0);
  await card.getByRole('button', { name: 'Add more images' }).click();
  await expect(card.getByText('Drop image files, a folder, or a .zip here')).toBeVisible();

  // Resolution: generating row 7 without a picture clears the amber line.
  await panel.locator('select').first().selectOption('');
  await expect(panel).not.toContainText('Row 7 expects');
  await expect(panel.locator('select')).toHaveCount(0);
});

test('flag on: full coverage reads as All N rows have a picture', async ({ page }) => {
  await toPreviewWithData(page);
  await openRailPanel(page);
  await page.getByTestId('image-intake-input').first().setInputFiles([
    { name: 'images.zip', mimeType: 'application/zip', buffer: readFileSync(IMAGES_ZIP) },
    { name: 'martins.jpg', mimeType: 'image/jpeg', buffer: PNG_1PX },
  ]);
  await expect(page.getByTestId('image-match-panel').first())
    .toContainText('All 7 rows have a picture.');
  await closeRailPanel(page);
  await expect(page.getByTestId('image-rail-summary')).toContainText('All 7 rows have a picture.');
});

test('flag on: the three events and the generate_completed images count', async ({ page }) => {
  const events = await captureAnalytics(page);

  // image_field_created comes from the click-create path on template A.
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_A);
  await page.getByTestId('doc-image-button').click();
  await page.locator('#image-field-name').fill('PHOTO');
  await page.getByRole('button', { name: 'Create field' }).click();
  await expect(page.getByTestId('image-badge')).toBeVisible();

  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])').setInputFiles(DATA_XLSX);
  await page.getByRole('button', { name: 'Looks good' }).click();
  await skipPicturesStep(page);
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  await openRailPanel(page);
  await page.getByTestId('image-intake-input').first().setInputFiles(IMAGES_ZIP);
  await expect(page.getByTestId('image-match-panel').first()).toBeVisible();
  await closeRailPanel(page);

  await page.getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });

  await expect.poll(() => events.filter((e) => e.event === 'image_field_created').length).toBe(1);
  await expect.poll(() => events.filter((e) => e.event === 'images_added').length).toBe(1);
  expect(events.find((e) => e.event === 'images_added')!.data).toEqual({ count: 6, via: 'zip' });
  await expect.poll(() => events.filter((e) => e.event === 'image_match').length).toBe(1);
  expect(events.find((e) => e.event === 'image_match')!.data).toEqual({ matched: 6, unmatched: 1, unused: 1 });
  await expect.poll(() => events.filter((e) => e.event === 'generate_completed').length).toBe(1);
  expect(events.find((e) => e.event === 'generate_completed')!.data).toEqual({ count: '7', images: 6 });
});

test('flag on: with no image field the Data step card is absent', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEXT_TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await expect(page.getByTestId('image-intake')).toHaveCount(0);
});


// ── UX round: pluralization, extents, rail summary, stepper ────────────────

import * as XLSX from 'xlsx';

function oneRowXlsx(row: Record<string, string>): { name: string; mimeType: string; buffer: Buffer } {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([row]), 'Sheet1');
  return {
    name: 'one.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  };
}

test('singular copy: 1 row, coverage phrasing, 1 picture added', async ({ page }) => {
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])')
    .setInputFiles(oneRowXlsx({ NAME: 'Anna Ozola', COURSE: 'C', DATE: '2026-06-11', PHOTO: 'anna.jpg' }));
  await page.getByRole('button', { name: 'Looks good' }).click();
  // Guided step in its singular form, then skipped.
  await expect(page.getByText('Your PHOTO column names 1 picture. Add the image files and each row gets its photo.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue without pictures' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  // Singular banner copy.
  await expect(page.getByText('Data loaded · 1 row · 4 fields each · Previewing document 1 of 1'))
    .toBeVisible({ timeout: 10_000 });

  // No pictures yet: the rail guidance phrases the single row.
  await expect(page.getByTestId('image-rail-summary')).toContainText('The row expects a picture, like anna.jpg.');

  await openRailPanel(page);
  await page.getByTestId('image-intake-input').first().setInputFiles([
    { name: 'anna.jpg', mimeType: 'image/jpeg', buffer: PNG_1PX },
  ]);
  // Singular added line in the collapsed card and singular coverage.
  await expect(page.getByText('1 picture added.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('image-match-panel').first()).toContainText('The row has a picture.');
  await closeRailPanel(page);
  await expect(page.getByTestId('image-rail-summary')).toContainText('The row has a picture.');
});

test('extent honesty: template B images measure their extents on all three surfaces', async ({ page }) => {
  // Editor surface.
  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_B);
  const editorImgs = page.getByTestId('doc-image');
  await expect(editorImgs).toHaveCount(2);
  const logoEd = await editorImgs.nth(0).boundingBox();
  const dotEd = await editorImgs.nth(1).boundingBox();
  expect(Math.abs(logoEd!.width - 150)).toBeLessThanOrEqual(1);
  expect(Math.abs(logoEd!.height - 40)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotEd!.width - 14)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotEd!.height - 14)).toBeLessThanOrEqual(1);

  // Merged preview and right rail.
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])')
    .setInputFiles(oneRowXlsx({ NAME: 'Anna Ozola' }));
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  const centerImgs = page.getByTestId('document-area').getByTestId('doc-image');
  await expect(centerImgs).toHaveCount(2);
  const logoC = await centerImgs.nth(0).boundingBox();
  const dotC = await centerImgs.nth(1).boundingBox();
  expect(Math.abs(logoC!.width - 150)).toBeLessThanOrEqual(1);
  expect(Math.abs(logoC!.height - 40)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotC!.width - 14)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotC!.height - 14)).toBeLessThanOrEqual(1);

  const railImgs = page.getByTestId('preview-panel-doc').getByTestId('doc-image');
  await expect(railImgs).toHaveCount(2);
  const logoR = await railImgs.nth(0).boundingBox();
  const dotR = await railImgs.nth(1).boundingBox();
  expect(Math.abs(logoR!.width - 150)).toBeLessThanOrEqual(1);
  expect(Math.abs(logoR!.height - 40)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotR!.width - 14)).toBeLessThanOrEqual(1);
  expect(Math.abs(dotR!.height - 14)).toBeLessThanOrEqual(1);
});

test('extent honesty: a swapped row photo measures its fit extents, center and rail', async ({ page }) => {
  // Real anna.jpg (600 x 800) so the fit math is meaningful: box 110 x 139,
  // scale = min(110/600, 139/800) on the EMU axes gives 104.25 x 139.
  const JSZipMod = (await import('jszip')).default;
  const zip = await JSZipMod.loadAsync(readFileSync(IMAGES_ZIP));
  const anna = await zip.file('anna.jpg')!.async('nodebuffer');

  await page.goto(`${ON}/editor`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE_C);
  await expect(page.getByTestId('image-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]:not([data-testid="image-intake-input"])')
    .setInputFiles(oneRowXlsx({ NAME: 'Anna Ozola', COURSE: 'C', DATE: '2026-06-11', PHOTO: 'anna.jpg' }));
  await page.getByRole('button', { name: 'Looks good' }).click();
  // The guided Pictures step fires here: add the photo right in it.
  await expect(page.getByRole('heading', { name: 'Add the pictures' })).toBeVisible();
  await page.getByTestId('image-intake-input').first().setInputFiles([
    { name: 'anna.jpg', mimeType: 'image/jpeg', buffer: anna },
  ]);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });

  const center = await page.getByTestId('document-area').getByTestId('doc-image').first().boundingBox();
  expect(Math.abs(center!.width - 104.25)).toBeLessThanOrEqual(1);
  expect(Math.abs(center!.height - 139)).toBeLessThanOrEqual(1);

  const rail = await page.getByTestId('preview-panel-doc').getByTestId('doc-image').first().boundingBox();
  expect(Math.abs(rail!.width - 104.25)).toBeLessThanOrEqual(1);
  expect(Math.abs(rail!.height - 139)).toBeLessThanOrEqual(1);
});

test('Generate step: compact rail summary replaces the full card; no stray Preview sublabel', async ({ page }) => {
  await toPreviewWithData(page);

  // The full card is gone from the Generate step until opened via the rail.
  await expect(page.getByTestId('image-intake')).toHaveCount(0);
  await expect(page.getByTestId('image-rail-summary')).toBeVisible();
  await expect(page.getByTestId('image-rail-summary')).toContainText('No pictures yet. 7 rows expect one, like anna.jpg.');

  // The stepper carries no sublabel on the Generate step (the stray
  // Preview label under Data is gone).
  await expect(page.getByTestId('step-sublabel')).toHaveCount(0);

  // Add more images opens the full panel as a dialog.
  await openRailPanel(page);
  await expect(page.getByTestId('image-intake').first()).toContainText('Pictures for your PHOTO column');
});
