import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';
import { generateDocument } from '../src/features/generator/utils/documentGenerator';
import type { Placeholder } from '../src/features/editor/utils/types';

// Merge placeholders by name: confirming a name that already belongs to a
// field asks the user to merge, and on confirm the new selection becomes an
// additional occurrence of THAT field — one fields-panel entry, one value
// filling every location. Cancel backs out without creating anything.

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

async function makeDocx(paragraphs: string[]): Promise<Buffer> {
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
<w:document xmlns:w="${W_NS}"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function docText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
}

async function readDocumentXml(bytes: Buffer | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes as Buffer);
  return zip.file('word/document.xml')!.async('string');
}

async function upload(page: Page, paragraphs: string[]): Promise<void> {
  await page.goto('/editor?flow=template-data');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'merge.docx', mimeType: DOCX_MIME, buffer: await makeDocx(paragraphs),
  });
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(0\)/i)).toBeVisible();
}

async function center(page: Page, word: string) {
  const box = await page.getByText(word, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`word not found: ${word}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function selectRange(page: Page, fromWord: string, toWord: string) {
  const a = await center(page, fromWord);
  const b = await center(page, toWord);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
}

async function typeName(page: Page, name: string) {
  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill(name);
  await page.keyboard.press('Enter');
}

async function downloadTemplate(page: Page): Promise<Buffer> {
  await page.getByRole('button', { name: 'Download' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^Template/ }).click();
  const download = await downloadPromise;
  return fs.readFileSync((await download.path())!);
}

function ph(name: string, colorIndex = 0): Placeholder {
  return { id: `t-${name}`, name, originalText: '', colorIndex, occurrences: [] };
}

async function mergeInNode(taggedBytes: Buffer, values: Record<string, string>): Promise<string> {
  const ab = taggedBytes.buffer.slice(
    taggedBytes.byteOffset, taggedBytes.byteOffset + taggedBytes.byteLength,
  ) as ArrayBuffer;
  const mapping = Object.fromEntries(Object.keys(values).map((k) => [k, k]));
  const blob = generateDocument(ab, values, mapping, Object.keys(values).map((k) => ph(k)));
  return docText(await readDocumentXml(Buffer.from(await blob.arrayBuffer())));
}

const mergePrompt = (page: Page) => page.getByText(/already exists/i);

test('re-using a name merges the selection into the existing field after confirmation', async ({ page }) => {
  await upload(page, ['Employee Anna signs first', 'Witness Ozola signs second']);

  await page.getByText('Anna', { exact: true }).click();
  await typeName(page, 'person');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  // Same name on a different selection: the merge prompt appears; confirm.
  await page.getByText('Ozola', { exact: true }).click();
  await typeName(page, 'person');
  await expect(mergePrompt(page)).toBeVisible();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();

  // Still ONE field, now covering both locations (x2 in the panel).
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
  await expect(page.getByText('x2', { exact: true })).toBeVisible();
  // Both words became chips of the same field.
  await expect(page.locator('[data-token-id]', { hasText: 'Anna' })).toHaveCount(0);
  await expect(page.locator('[data-token-id]', { hasText: 'Ozola' })).toHaveCount(0);

  // Both locations tag and fill with the same value.
  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  expect(xml.match(/\{\{person\}\}/g)).toHaveLength(2);
  const merged = await mergeInNode(tagged, { person: 'Maija Berzina' });
  expect(merged).toContain('Employee Maija Berzina signs first');
  expect(merged).toContain('Witness Maija Berzina signs second');
});

test('cancelling the merge prompt keeps everything unchanged and lets the user rename', async ({ page }) => {
  await upload(page, ['Employee Anna signs first', 'Witness Ozola signs second']);

  await page.getByText('Anna', { exact: true }).click();
  await typeName(page, 'person');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  await page.getByText('Ozola', { exact: true }).click();
  await typeName(page, 'person');
  await expect(mergePrompt(page)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  // No merge happened: the prompt is gone, the name input is back with the
  // typed name, "Ozola" is still a plain word, and there is still one field
  // with one occurrence.
  await expect(mergePrompt(page)).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveValue('person');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
  await expect(page.getByText('x2', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-token-id]', { hasText: 'Ozola' })).toHaveCount(1);

  // Picking a different name from the same popover creates a second field.
  await typeName(page, 'witness');
  await expect(page.getByText(/Fields \(2\)/i)).toBeVisible();
});

test('a brand-new unique name still creates a new field with no prompt', async ({ page }) => {
  await upload(page, ['Employee Anna signs first', 'Witness Ozola signs second']);

  await page.getByText('Anna', { exact: true }).click();
  await typeName(page, 'employee');
  await page.getByText('Ozola', { exact: true }).click();
  await typeName(page, 'witness');

  await expect(mergePrompt(page)).toHaveCount(0);
  await expect(page.getByText(/Fields \(2\)/i)).toBeVisible();
});

test('a multi-paragraph selection merges into an existing single-word field and both tag', async ({ page }) => {
  await upload(page, [
    'Recipient Anna gets a copy',
    'Deliver to the main office',
    'before Friday every week',
  ]);

  await page.getByText('Anna', { exact: true }).click();
  await typeName(page, 'target');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  // Cross-paragraph selection (spans paragraphs 2 and 3), same name, merge.
  await selectRange(page, 'main', 'Friday');
  await typeName(page, 'target');
  await expect(mergePrompt(page)).toBeVisible();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();
  await expect(page.getByText('x2', { exact: true })).toBeVisible();

  // Both occurrences tag: the single word in place, the spanned one via
  // collapse-and-replace; the document stays well-formed.
  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  expect(xml.match(/\{\{target\}\}/g)).toHaveLength(2);
  const errors = await page.evaluate(
    (s: string) => new DOMParser().parseFromString(s, 'text/xml').getElementsByTagName('parsererror').length, xml);
  expect(errors).toBe(0);

  const merged = await mergeInNode(tagged, { target: 'Riga branch' });
  expect(merged).toContain('Recipient Riga branch gets a copy');
  expect(merged).toContain('Deliver to the Riga branch every week');
});
