import fs from 'node:fs';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';
import { generateDocument } from '../src/features/generator/utils/documentGenerator';
import type { Placeholder } from '../src/features/editor/utils/types';

// Acceptance spec for position-based template tagging: fields whose text
// spans runs with DIFFERENT formatting (bold + plain, inline code character
// style, split nested-list runs) must survive into the downloaded template
// and merge correctly. The legacy text-search tagger silently dropped them
// because the text never sits inside a single <w:t>. Every test drives the
// real editor UI (upload → select → name → download template) and then
// merges the downloaded bytes through the real generator in Node.

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
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`);
  zip.folder('_rels')!.file('.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word')!.folder('_rels')!.file('document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`);
  zip.folder('word')!.file('styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W_NS}">
<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr></w:style>
</w:styles>`);
  zip.folder('word')!.file('numbering.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W_NS}">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="&#9702;"/></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`);
  zip.folder('word')!.file('document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Visible document text of a document.xml string, entities intact enough
 *  for the plain-ASCII fixtures used here. */
function docText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
}

async function readDocumentXml(bytes: Buffer | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes as Buffer);
  return zip.file('word/document.xml')!.async('string');
}

/** The produced template must at minimum be well-formed XML; parse it with
 *  the browser's real parser. */
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

async function upload(page: Page, buffer: Buffer, name = 'fixture.docx'): Promise<void> {
  await page.goto('/editor?flow=template-data');
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: DOCX_MIME, buffer });
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(0\)/i)).toBeVisible();
}

async function center(page: Page, word: string) {
  const box = await page.getByText(word, { exact: true }).boundingBox();
  if (!box) throw new Error(`word not found: ${word}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function nameField(page: Page, name: string): Promise<void> {
  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill(name);
  await page.keyboard.press('Enter');
}

async function clickField(page: Page, word: string, name: string): Promise<void> {
  await page.getByText(word, { exact: true }).click();
  await nameField(page, name);
}

async function dragField(page: Page, fromWord: string, toWord: string, name: string): Promise<void> {
  const a = await center(page, fromWord);
  const b = await center(page, toWord);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await nameField(page, name);
}

async function downloadTemplate(page: Page): Promise<Buffer> {
  await page.getByRole('button', { name: 'Download' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^Template/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/_template\.docx$/);
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

// ── The mixed-formatting repro: the case the old tagger silently dropped ────

test('fields spanning bold+plain, inline code, and nested-list runs tag and merge', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    // P1: field spans a bold word + plain word, with glued punctuation after.
    `<w:p><w:r><w:t xml:space="preserve">Dear </w:t></w:r>` +
    `<w:r><w:rPr><w:b/></w:rPr><w:t>Anna</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> Ozola, welcome.</w:t></w:r></w:p>` +
    // P2: field inside an inline code (character style) span split across
    // two runs whose rPr differ (second adds bold) — never merged by rPr.
    `<w:p><w:r><w:t xml:space="preserve">Run </w:t></w:r>` +
    `<w:r><w:rPr><w:rStyle w:val="CodeChar"/><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>veidne</w:t></w:r>` +
    `<w:r><w:rPr><w:rStyle w:val="CodeChar"/><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/></w:rPr><w:t xml:space="preserve"> merge</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> to continue.</w:t></w:r></w:p>` +
    // P3: nested bullet list item with the field spanning italic + plain runs.
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr>` +
    `<w:r><w:t xml:space="preserve">Deliver to </w:t></w:r>` +
    `<w:r><w:rPr><w:i/></w:rPr><w:t>Riga</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> office now.</w:t></w:r></w:p>`,
  );
  await upload(page, fixture);

  await dragField(page, 'Anna', 'Ozola,', 'FULLNAME');
  await dragField(page, 'veidne', 'merge', 'CMD');
  await dragField(page, 'Riga', 'office', 'PLACE');
  await expect(page.getByText(/Fields \(3\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  // Every field made it into the template — this is what used to fail.
  const text = docText(xml);
  expect(text).toContain('Dear {{FULLNAME}}, welcome.'); // glued comma preserved
  expect(text).toContain('Run {{CMD}} to continue.');
  expect(text).toContain('Deliver to {{PLACE}} now.'); // field spans "Riga office"
  expect(text).not.toMatch(/Anna|Ozola|veidne|merge|Riga|office/);

  // Surrounding formatting survives: bold run, code character style + font,
  // and the list item's numbering are all still in the XML.
  expect(xml).toContain('<w:b/>');
  expect(xml).toContain('CodeChar');
  expect(xml).toContain('Consolas');
  expect(xml).toContain('<w:numPr>');
  expect(warnings, 'no field may fail to tag').toEqual([]);

  // The downloaded template re-uploads with all fields intact.
  await page.evaluate(() => localStorage.clear());
  await page.goto('/editor?flow=template-data');
  await page.locator('input[type="file"]').setInputFiles({ name: 'tagged.docx', mimeType: DOCX_MIME, buffer: tagged });
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(3\)/i)).toBeVisible();

  // And merging the downloaded template substitutes real data for each field.
  const merged = await mergeInNode(
    tagged,
    { FULLNAME: 'Test Person', CMD: 'veidne run', PLACE: 'Liepāja' },
    [ph('FULLNAME', 'Anna Ozola', 0), ph('CMD', 'veidne merge', 1), ph('PLACE', 'Riga office', 2)],
  );
  expect(merged).toContain('Dear Test Person, welcome.');
  expect(merged).toContain('Run veidne run to continue.');
  expect(merged).toContain('Deliver to Liepāja now.');
  expect(merged).not.toContain('{{');
});

test('multiple fields in one paragraph and repeated occurrences all tag without corrupting each other', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    // Both CITY occurrences live in the SAME <w:t>; TOWER sits in its own
    // bold run between edits — exercises last-to-first splice ordering.
    `<w:p><w:r><w:t xml:space="preserve">Alpha visits Alpha at </w:t></w:r>` +
    `<w:r><w:rPr><w:b/></w:rPr><w:t>Beta</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> tower.</w:t></w:r></w:p>`,
  );
  await upload(page, fixture);

  await clickField(page, 'Beta', 'TOWER');
  // Clicking the first "Alpha" creates a field with BOTH occurrences.
  await page.getByText('Alpha', { exact: true }).first().click();
  await nameField(page, 'CITY');
  await expect(page.getByText(/Fields \(2\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  const text = docText(xml);
  expect(text).toContain('{{CITY}} visits {{CITY}} at {{TOWER}} tower.');
  expect(warnings).toEqual([]);

  const merged = await mergeInNode(tagged, { CITY: 'Alpha', TOWER: 'Omega' },
    [ph('CITY', 'Alpha', 0), ph('TOWER', 'Beta', 1)]);
  expect(merged).toContain('Alpha visits Alpha at Omega tower.');
});

test('fields adjacent to w:tab, w:br, and at paragraph end tag correctly and keep the structure', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    `<w:p><w:r><w:tab/><w:t>Amount</w:t></w:r>` +
    `<w:r><w:br/><w:t xml:space="preserve">due soon</w:t></w:r></w:p>`,
  );
  await upload(page, fixture);

  await clickField(page, 'Amount', 'AMT');   // tab immediately before
  await clickField(page, 'soon', 'WHEN');    // paragraph end, br before its run
  await expect(page.getByText(/Fields \(2\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  const text = docText(xml);
  expect(text).toContain('{{AMT}}');
  expect(text).toContain('due {{WHEN}}');
  expect(xml).toContain('<w:tab/>');
  expect(xml).toContain('<w:br/>');
  expect(warnings).toEqual([]);

  const merged = await mergeInNode(tagged, { AMT: '42.50', WHEN: 'today' },
    [ph('AMT', 'Amount', 0), ph('WHEN', 'soon', 1)]);
  expect(merged).toContain('42.50');
  expect(merged).toContain('due today');
});

test('simple single-run field still tags exactly as before', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    `<w:p><w:r><w:t xml:space="preserve">Contract number seven is ready</w:t></w:r></w:p>`,
  );
  await upload(page, fixture);
  await clickField(page, 'seven', 'NUM');

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);
  expect(docText(xml)).toContain('Contract number {{NUM}} is ready');
  expect(warnings).toEqual([]);

  const merged = await mergeInNode(tagged, { NUM: '7' }, [ph('NUM', 'seven', 0)]);
  expect(merged).toContain('Contract number 7 is ready');
});

test('a selection spanning a tab cannot tag but fails loudly, never corrupting the document', async ({ page }) => {
  const warnings = collectTaggerWarnings(page);
  const fixture = await makeDocx(
    `<w:p><w:r><w:t xml:space="preserve">Please pay</w:t></w:r>` +
    `<w:r><w:tab/><w:t xml:space="preserve">now thanks</w:t></w:r></w:p>`,
  );
  await upload(page, fixture);

  // Drag across the tab: positional tagging rejects the range (the tab has
  // no text position) and the text-search fallback cannot match across the
  // tab either — the safety net must WARN instead of silently dropping.
  await dragField(page, 'pay', 'now', 'PAYNOW');
  await expect(page.getByText(/Fields \(1\)/i)).toBeVisible();

  const tagged = await downloadTemplate(page);
  const xml = await readDocumentXml(tagged);
  await expectWellFormed(page, xml);

  // Document intact, no partial edits, and the failure was reported.
  const text = docText(xml);
  expect(text).toContain('Please pay');
  expect(text).toContain('now thanks');
  expect(text).not.toContain('{{');
  expect(xml).toContain('<w:tab/>');
  expect(warnings.length).toBeGreaterThan(0);
  expect(warnings[0]).toContain('PAYNOW');
});
