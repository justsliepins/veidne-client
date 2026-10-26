import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';
import { generateDocument } from '../src/features/generator/utils/documentGenerator';
import type { Placeholder } from '../src/features/editor/utils/types';

// Acceptance spec for multi-paragraph fields (collapse-and-replace): a
// selection may span paragraphs, headings, and list lines. On tagging the
// covered text is deleted across every spanned paragraph, ONE {{name}} lands
// at the span's start, the surviving tail of the last paragraph merges into
// the first (anchor) paragraph — which keeps its own style by design — and
// the emptied <w:p> elements are removed. Spans that cannot collapse safely
// (crossing table cells) are refused with a warning and the file stays
// untouched and valid. Every test drives the real editor UI and validates
// the produced XML with the browser's real parser.

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

async function makeDocx(bodyXml: string): Promise<Buffer> {
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
<w:document xmlns:w="${W_NS}"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

const para = (text: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}` +
  `<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

function docText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
}

async function readDocumentXml(bytes: Buffer | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes as Buffer);
  return zip.file('word/document.xml')!.async('string');
}

async function expectWellFormed(page: Page, xml: string): Promise<void> {
  const errors = await page.evaluate(
    (s: string) => new DOMParser().parseFromString(s, 'text/xml').getElementsByTagName('parsererror').length,
    xml,
  );
  expect(errors, 'tagged document.xml must stay well-formed').toBe(0);
}

function collectTaggerWarnings(page: Page): string[] {
  const warnings: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('[documentTagger]')) warnings.push(msg.text());
  });
  return warnings;
}

async function upload(page: Page, buffer: Buffer): Promise<void> {
  await page.goto('/editor?flow=template-data');
  await page.locator('input[type="file"]').setInputFiles({ name: 'fixture.docx', mimeType: DOCX_MIME, buffer });
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(0\)/i)).toBeVisible();
}

async function center(page: Page, word: string) {
  const box = await page.getByText(word, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`word not found: ${word}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragField(page: Page, fromWord: string, toWord: string, name: string): Promise<void> {
  const a = await center(page, fromWord);
  const b = await center(page, toWord);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
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

function ph(name: string, originalText: string, colorIndex = 0): Placeholder {
  return { id: `t-${name}`, name, originalText, colorIndex, occurrences: [] };
}

async function mergeInNode(
  taggedBytes: Buffer,
  values: Record<string, string>,
  placeholders: Placeholder[],
): Promise<string> {
  const ab = taggedBytes.buffer.slice(
    taggedBytes.byteOffset, taggedBytes.byteOffset + taggedBytes.byteLength,
  ) as ArrayBuffer;
  const mapping = Object.fromEntries(Object.keys(values).map((k) => [k, k]));
  const blob = generateDocument(ab, values, mapping, placeholders);
  return docText(await readDocumentXml(Buffer.from(await blob.arrayBuffer())));
}

/** The single <w:p> containing the tag, for structural assertions. */
function paraContaining(xml: string, needle: string): string {
  const paras = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:p\b[^>]*\/>/g) ?? [];
  const hits = paras.filter((p) => docText(p).includes(needle));
  expect(hits, `exactly one paragraph must contain ${needle}`).toHaveLength(1);
  return hits[0];
}

const countParas = (xml: string) => (xml.match(/<w:p[ >/]/g) ?? []).length;

// ── Heading + body line: the reported real-world case ───────────────────────

test('a span across a heading and the body line below collapses to one tagged paragraph in the heading style', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    para('Task 1: Environment Setup', 'Heading2') +
    para('Files: requirements and scripts here') +
    para('Rules stay below untouched'),
  );
  await upload(page, fixture);

  // Selection starts on the heading's first word and ends mid-body-line.
  await dragField(page, 'Task', 'requirements', 'TASKSPEC');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(warnings).toHaveLength(0);

  // One tag; the two spanned paragraphs collapsed into one (3 -> 2).
  expect(xml.match(/\{\{TASKSPEC\}\}/g)).toHaveLength(1);
  expect(countParas(xml)).toBe(2);

  // The surviving paragraph keeps the ANCHOR (heading) style and carries the
  // tag plus the un-selected tail of the body line.
  const tagPara = paraContaining(xml, '{{TASKSPEC}}');
  expect(tagPara).toContain('<w:pStyle w:val="Heading2"/>');
  expect(docText(tagPara)).toBe('{{TASKSPEC}} and scripts here');
  expect(docText(xml)).toContain('Rules stay below untouched');

  const merged = await mergeInNode(tagged, { TASKSPEC: 'Task 9: Deploy Pipeline' }, [ph('TASKSPEC', '')]);
  expect(merged).toContain('Task 9: Deploy Pipeline and scripts here');
  expect(merged).not.toContain('{{TASKSPEC}}');
});

// ── Partial edges: starts mid-paragraph-1, ends mid-paragraph-3 ─────────────

test('a span from mid-paragraph to mid-paragraph preserves both un-selected ends and keeps the anchor style', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    para('Alpha bravo charlie', 'Heading3') +
    para('delta echo') +
    para('foxtrot golf hotel') +
    para('tail paragraph stays'),
  );
  await upload(page, fixture);

  await dragField(page, 'bravo', 'golf', 'MID');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(warnings).toHaveLength(0);

  // Three spanned paragraphs collapse into one; the untouched fourth stays.
  expect(xml.match(/\{\{MID\}\}/g)).toHaveLength(1);
  expect(countParas(xml)).toBe(2);

  const tagPara = paraContaining(xml, '{{MID}}');
  expect(tagPara).toContain('<w:pStyle w:val="Heading3"/>');
  expect(docText(tagPara)).toBe('Alpha {{MID}} hotel');
  expect(docText(xml)).toContain('tail paragraph stays');

  const merged = await mergeInNode(tagged, { MID: 'replacement text' }, [ph('MID', '')]);
  expect(merged).toContain('Alpha replacement text hotel');
});

// ── Cross-cell spans: refused, fails safe ────────────────────────────────────

test('a span across two table cells is refused with a warning and the table stays intact', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    `<w:tbl><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>` +
    `<w:tr><w:tc>${para('Alpha beta')}</w:tc><w:tc>${para('Gamma delta')}</w:tc></w:tr>` +
    `</w:tbl>` +
    para('after the table'),
  );
  await upload(page, fixture);

  // The selection itself is allowed; only tagging refuses it.
  await dragField(page, 'beta', 'Gamma', 'XCELL');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  // No tag was written, both warnings fired (refusal + final safety net),
  // and the table kept both cells with their original text.
  expect(xml).not.toContain('{{XCELL}}');
  expect(warnings.some((w) => w.includes('"XCELL"'))).toBe(true);
  expect(xml.match(/<w:tc>/g)).toHaveLength(2);
  expect(docText(xml)).toContain('Alpha beta');
  expect(docText(xml)).toContain('Gamma delta');
  expect(docText(xml)).toContain('after the table');
});

// ── Blank lines inside a span ───────────────────────────────────────────────

test('a span across text, a blank line, and more text collapses to one tag and removes the empty paragraphs', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  // Shape that once failed: a heading line, a blank line, a short line,
  // another blank line, a closing line — all body siblings.
  const fixture = await makeDocx(
    para('Orchard status report week nine') +
    '<w:p/>' +
    para('apples picked and counted') +
    '<w:p/>' +
    para('totals are listed here') +
    para('CHECKLIST stays below'),
  );
  await upload(page, fixture);

  await dragField(page, 'Orchard', 'here', 'SPANBLOCK');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(warnings).toHaveLength(0);

  // One tag; the five spanned paragraphs (blank lines included) collapsed
  // into one, so only the tag paragraph and the untouched line remain.
  expect(xml.match(/\{\{SPANBLOCK\}\}/g)).toHaveLength(1);
  expect(countParas(xml)).toBe(2);
  expect(docText(paraContaining(xml, '{{SPANBLOCK}}'))).toBe('{{SPANBLOCK}}');
  expect(docText(xml)).toContain('CHECKLIST stays below');

  const merged = await mergeInNode(tagged, { SPANBLOCK: 'replacement block text' }, [ph('SPANBLOCK', '')]);
  expect(merged).toContain('replacement block text');
  expect(merged).toContain('CHECKLIST stays below');
});

test('multiple consecutive blank lines inside a span still collapse to one tag', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    para('Alpha start') +
    '<w:p/><w:p/><w:p/>' +
    para('omega end'),
  );
  await upload(page, fixture);

  await dragField(page, 'start', 'omega', 'MULTIBLANK');
  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(warnings).toHaveLength(0);

  expect(xml.match(/\{\{MULTIBLANK\}\}/g)).toHaveLength(1);
  expect(countParas(xml)).toBe(1);
  expect(docText(paraContaining(xml, '{{MULTIBLANK}}'))).toBe('Alpha {{MULTIBLANK}} end');

  const merged = await mergeInNode(tagged, { MULTIBLANK: 'joined value' }, [ph('MULTIBLANK', '')]);
  expect(merged).toContain('Alpha joined value end');
});

test('a span whose empty paragraph is a table cell\'s only paragraph is still refused, table intact', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    para('Alpha beta') +
    `<w:tbl><w:tblGrid><w:gridCol w:w="8000"/></w:tblGrid>` +
    `<w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>` +
    para('Gamma delta'),
  );
  await upload(page, fixture);

  await dragField(page, 'beta', 'Gamma', 'XEMPTY');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  // Refused (the cell's paragraph is not a sibling of the body paragraphs);
  // the cell keeps its only <w:p> and nothing was tagged.
  expect(xml).not.toContain('{{XEMPTY}}');
  expect(warnings.some((w) => w.includes('"XEMPTY"'))).toBe(true);
  expect(xml.match(/<w:tc>/g)).toHaveLength(1);
  expect(/<w:tc>\s*<w:p\/?/.test(xml)).toBe(true);
  expect(docText(xml)).toContain('Alpha beta');
  expect(docText(xml)).toContain('Gamma delta');
});

// ── Regression: single-paragraph behavior is untouched ──────────────────────

test('a within-paragraph phrase field still tags positionally alongside a multi-paragraph field', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    para('Dear Anna Ozola welcome', 'Heading2') +
    para('Please attend the yearly meetup') +
    para('Best regards from everyone'),
  );
  await upload(page, fixture);

  // One normal within-paragraph field...
  await dragField(page, 'Anna', 'Ozola', 'NAME');
  // ...and one spanning paragraphs 2-3.
  await dragField(page, 'yearly', 'Best', 'SPAN');
  await expect(page.getByText(/Fields \(2\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(warnings).toHaveLength(0);

  expect(xml.match(/\{\{NAME\}\}/g)).toHaveLength(1);
  expect(xml.match(/\{\{SPAN\}\}/g)).toHaveLength(1);
  expect(countParas(xml)).toBe(2);
  expect(docText(paraContaining(xml, '{{NAME}}'))).toBe('Dear {{NAME}} welcome');
  expect(docText(paraContaining(xml, '{{SPAN}}'))).toBe('Please attend the {{SPAN}} regards from everyone');

  const merged = await mergeInNode(
    tagged, { NAME: 'Maija Berzina', SPAN: 'quarterly review and warm' },
    [ph('NAME', ''), ph('SPAN', '', 1)],
  );
  expect(merged).toContain('Dear Maija Berzina welcome');
  expect(merged).toContain('Please attend the quarterly review and warm regards from everyone');
});
