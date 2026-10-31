import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

// F5: the document body is one tab stop with roving tabindex; arrows move focus
// word to word, Enter selects, Shift+arrows extends, Escape exits. None of this
// is flag gated, so the default (flag on) server is enough.
const ON = 'http://localhost:5173';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Smallest valid .docx carrying the given paragraphs as plain runs, so the
 *  parser detects no fields and every word starts taggable. */
async function makeDocx(paragraphs: string[]): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels')!.file('.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`)
    .join('');
  zip.folder('word')!.file('document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { name: 'kbd.docx', mimeType: DOCX_MIME, buffer };
}

async function uploadDoc(page: Page, paragraphs: string[]) {
  await page.goto(`${ON}/editor?flow=template-data`);
  await page.locator('input[type="file"]').setInputFiles(await makeDocx(paragraphs));
  await expect(page.getByTestId('document-area')).toBeVisible();
}

const roving = (page: Page) => page.locator('[data-token-id][tabindex="0"]');
const activeText = (page: Page) => page.evaluate(() => document.activeElement?.textContent ?? '');

test('the document body is a single tab stop with roving focus', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you for reading']);

  // Exactly one word is tabbable; the rest are -1 (one tab stop into the body).
  await expect(roving(page)).toHaveCount(1);
  const all = page.locator('[data-token-id]');
  expect(await all.count()).toBeGreaterThan(1);

  // Arrow keys walk focus word to word, and the single tab stop follows focus.
  await roving(page).focus();
  expect((await activeText(page)).trim()).toBe('Dear');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect((await activeText(page)).trim()).toBe('thank');
  await expect(roving(page)).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  expect((await activeText(page)).trim()).toBe('customer');
});

test('Enter selects the focused word and creates a field', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  await roving(page).focus();
  await page.keyboard.press('Enter');
  // The naming popover opens over the selection and takes the input focus.
  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill('GREETING');
  await page.keyboard.press('Enter');

  // The field exists: a chip replaced the word and the sidebar lists it.
  await expect(page.getByText('GREETING', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
});

test('Shift plus arrows extends the selection into a phrase field', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  await roving(page).focus();
  // Grow the selection across two words; the popover stays closed during growth.
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.keyboard.up('Shift');

  const wordsBefore = await page.locator('[data-token-id]').count();
  // Commit with Enter, then name and create the phrase field.
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill('PHRASE');
  await page.keyboard.press('Enter');

  await expect(page.getByText('PHRASE', { exact: true }).first()).toBeVisible();
  // Two words were consumed into the one chip.
  expect(await page.locator('[data-token-id]').count()).toBe(wordsBefore - 2);
});

test('Escape exits the document body', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  await roving(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(tag).toBe('BODY');
});

test('a large document stays responsive under arrow navigation', async ({ page }) => {
  // ~3600 words: a stress document the roving layer must walk without a render
  // per keystroke (plain arrow moves focus imperatively, no React re-render).
  const paras = Array.from({ length: 300 }, (_, i) =>
    `Paragraph ${i} alpha beta gamma delta epsilon zeta eta theta iota kappa lambda`);
  await uploadDoc(page, paras);
  expect(await page.locator('[data-token-id]').count()).toBeGreaterThan(3000);

  await roving(page).focus();
  const start = Date.now();
  for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowRight');
  const elapsed = Date.now() - start;
  // Pure focus moves: 60 presses are dominated by Playwright IPC, not rendering.
  // A regression to per-keystroke full re-render of 3600 words blows past this.
  expect(elapsed).toBeLessThan(6000);

  // Navigation still lands correctly and selection still works after the burst.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox')).toBeVisible();
});

// Audit J16: what a keyboard or screen reader user gets around field creation.
test('the document is a labelled group that points to visible keyboard instructions', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  const doc = page.getByRole('group', { name: 'Your document' });
  await expect(doc).toHaveAttribute('aria-describedby', 'doc-keyboard-help');
  const help = page.locator('#doc-keyboard-help');
  await expect(help).toHaveText(
    'Keyboard: arrow keys move between words. Shift with an arrow key selects more words. Enter names the field.');
  // Shown on screen once a word has keyboard focus.
  await page.keyboard.press('Tab');
  await roving(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(help).toBeVisible();
  expect((await help.boundingBox())!.height).toBeGreaterThan(10);
});

test('the selection and the new field are announced, and focus returns to the next word', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  await roving(page).focus();
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('doc-live')).toHaveText('Selected: Dear customer');

  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Field name' }).fill('PHRASE');
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('doc-live')).toHaveText('Field PHRASE created.');
  // Not <body>: the first plain word after the new field, ready for the next one.
  await expect.poll(() => activeText(page)).toBe('thank');
});

test('Escape in the field name input returns focus to the word', async ({ page }) => {
  await uploadDoc(page, ['Dear customer thank you']);

  await roving(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Field name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Field name' })).toHaveCount(0);
  await expect.poll(() => activeText(page)).toBe('customer');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // WCAG 2.4.11: below 768 px the fields step has a fixed forward bar and the
  // docked field list at the bottom. A word reached with the arrow keys must
  // not end up hidden under them.
  test('a word focused with the arrow keys is scrolled clear of the bars at the bottom', async ({ page }) => {
    const paras = Array.from({ length: 60 }, (_, i) => `Line ${i} alpha beta gamma`);
    await uploadDoc(page, paras);
    await roving(page).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('textbox').fill('FIRST');
    await page.keyboard.press('Enter');
    const forward = page.locator('button', { hasText: 'Add your data' }).last();
    await expect(forward).toBeVisible();

    await roving(page).focus();
    for (let i = 0; i < 90; i++) await page.keyboard.press('ArrowRight');
    const word = await page.evaluate(() => document.activeElement?.getBoundingClientRect().bottom ?? 0);
    const barTop = (await forward.boundingBox())!.y;
    expect(word).toBeGreaterThan(0);
    // The forward bar's button sits inside the bar; the field list is above it.
    expect(word).toBeLessThanOrEqual(barTop - 40);
  });
});
