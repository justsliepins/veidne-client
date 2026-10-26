import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

// RULE GOING FORWARD: every primary gesture must have at least one gated spec
// that starts from UNTAGGED plain content (no {{ }} anywhere). Auto-detecting
// fixtures (templates that already carry fields) silently exercise the rendered
// chips while leaving the manual creation path — mouse click, mouse drag,
// keyboard — completely untested. A round-5 refactor broke mouse field creation
// (the naming popover never opened) and the whole gated suite still passed,
// because not one spec created a field from a plain word by hand. This file and
// keyboard-tagging.spec.ts close that gap; keep them green.
const ON = 'http://localhost:5173';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function makeDocx(text: string): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
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
  zip.folder('word')!.file('document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`);
  return { name: 'plain.docx', mimeType: DOCX_MIME, buffer: await zip.generateAsync({ type: 'nodebuffer' }) };
}

async function uploadPlain(page: Page) {
  await page.goto(`${ON}/editor?flow=template-data`);
  // No braces anywhere: the parser detects no fields, so every word is untagged.
  await page.locator('input[type="file"]').setInputFiles(await makeDocx('Dear Anna Ozola welcome to the annual program'));
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(0\)/i)).toBeVisible();
}

async function center(page: Page, word: string) {
  const box = await page.getByText(word, { exact: true }).boundingBox();
  if (!box) throw new Error(`word not found: ${word}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('mouse: clicking a single plain word opens the popover and creates a field', async ({ page }) => {
  await uploadPlain(page);

  await page.getByText('Anna', { exact: true }).click();
  // The regression: the naming popover must open on a real mouse click.
  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill('NAME');
  await page.keyboard.press('Enter');

  // Field exists: chip in the document, entry in the sidebar, one occurrence.
  await expect(page.getByText('NAME', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
  // "Anna" is now a chip, no longer a tabbable plain word.
  await expect(page.locator('[data-token-id]', { hasText: 'Anna' })).toHaveCount(0);
});

test('mouse: dragging across words selects a phrase and creates a multi-word field', async ({ page }) => {
  await uploadPlain(page);

  const wordsBefore = await page.locator('[data-token-id]').count();
  // Press on "Anna", release on "Ozola": the press-drag range gesture.
  const a = await center(page, 'Anna');
  const b = await center(page, 'Ozola');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();

  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill('FULLNAME');
  await page.keyboard.press('Enter');

  await expect(page.getByText('FULLNAME', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
  // Two words ("Anna", "Ozola") were consumed into the one chip.
  expect(await page.locator('[data-token-id]').count()).toBe(wordsBefore - 2);
});
