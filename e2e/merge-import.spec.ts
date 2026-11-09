import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';
import { generateDocument } from '../src/features/generator/utils/documentGenerator';

// End to end through the real UI for every merge-import fixture: what the
// upload shows, what the import step offers and ticks, what confirming does,
// and what the generated documents contain (body, headers and footers),
// merged against the fixture's matching spreadsheet.
//
// Fixtures: e2e/fixtures/merge-import (node e2e/fixtures/make-merge-import-fixtures.mjs).
// Each run also writes e2e/.artifacts/merge-import/<fixture>.json with the
// dialog text and the merged text, for review.

const BASE = 'http://localhost:5181';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'fixtures', 'merge-import');
const OUT = path.join(HERE, '.artifacts', 'merge-import');

type Row = { name: string; family: string; checked: boolean };

/** Analytics bodies the page posts, fulfilled locally. */
async function captureAnalytics(page: Page): Promise<{ event: string; data?: Record<string, unknown> }[]> {
  const events: { event: string; data?: Record<string, unknown> }[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/analytics') {
      try { events.push(JSON.parse(route.request().postData() ?? '{}')); } catch { /* ignore */ }
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 503, body: '' });
  });
  return events;
}

async function upload(page: Page, fixture: string): Promise<void> {
  await page.goto(`${BASE}/start`);
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, `${fixture}.docx`));
}

const dialog = (page: Page) => page.getByTestId('import-dialog');

async function dialogRows(page: Page): Promise<Row[]> {
  const rows = dialog(page).getByTestId('import-row');
  const out: Row[] = [];
  for (let i = 0; i < await rows.count(); i++) {
    const row = rows.nth(i);
    out.push({
      name: (await row.getByTestId('import-row-name').innerText()).trim(),
      family: (await row.getAttribute('data-family')) ?? '',
      checked: await row.getByRole('checkbox').isChecked(),
    });
  }
  return out;
}

async function tick(page: Page, name: string): Promise<void> {
  await dialog(page).getByTestId('import-row')
    .filter({ has: page.getByTestId('import-row-name').getByText(name, { exact: true }) })
    .getByRole('checkbox').check();
}

/** Text of every paragraph of the body, headers and footers of one .docx. */
async function partsText(bytes: Buffer): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(bytes);
  const out: Record<string, string> = {};
  for (const name of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n)).sort()) {
    const xml = await zip.file(name)!.async('string');
    out[name] = xml.split(/<\/w:p>/)
      .map((p) => Array.from(p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join(''))
      .filter(Boolean).join(' / ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  return out;
}

/** Data step, column matching, Generate, and the zip of every document. */
async function mergeAndDownload(page: Page, fixture: string): Promise<Record<string, string>[]> {
  await page.getByRole('button', { name: 'Add your data' }).last().click();
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, `${fixture}.xlsx`));
  await page.getByRole('button', { name: 'Looks good' }).click();
  await page.getByRole('button', { name: /^Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Download Word files' }).first().click();
  const download = await downloadPromise;
  const bytes = fs.readFileSync((await download.path())!);
  const zip = await JSZip.loadAsync(bytes);
  const docs = Object.keys(zip.files).filter((n) => n.endsWith('.docx')).sort();
  const out: Record<string, string>[] = [];
  for (const name of docs) out.push(await partsText(await zip.file(name)!.async('nodebuffer')));
  return out;
}

function record(fixture: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${fixture}.json`), JSON.stringify(data, null, 2));
}

/** No control syntax and no placeholder syntax survives into any part. */
function expectClean(docs: Record<string, string>[]): void {
  for (const doc of docs) {
    for (const [part, text] of Object.entries(doc)) {
      expect(text, `${part} still holds placeholder or control syntax`).not.toMatch(/\{\{|\}\}|\{%|<<|>>|«|»|\{#|\{\/|MERGEFIELD/);
    }
  }
}

/** textContent of every document paragraph containing `text`, as rendered
 *  (the editor's chips show the field name; the preview shows the value). */
async function renderedParagraphs(page: Page, text: string): Promise<string[]> {
  return page.locator('p').filter({ hasText: text }).evaluateAll((ps) => ps.map((p) => p.textContent ?? ''));
}

const all = (docs: Record<string, string>[]) => docs.map((d) => Object.values(d).join(' / '));

// ── Field families ──────────────────────────────────────────────────────────

test('Word MERGEFIELD letter: offered ticked, \\b/\\f kept, formatting noted, merges', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'word-mergefield');
  await expect(dialog(page)).toBeVisible();
  const rows = await dialogRows(page);
  expect(rows).toEqual(['First_Name', 'Last Name', 'Start_Date', 'Fee', 'Title', 'City'].map((name) => ({ name, family: 'mergefield', checked: true })));
  await expect(dialog(page).getByTestId('import-formats')).toContainText('Start_Date, Fee');
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 6 fields' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText(/Fields \(6\)/)).toBeVisible();
  // The comma glued to the field by its \f text shows next to the chip.
  expect(await renderedParagraphs(page, 'look forward')).toEqual(['Dear Title, we look forward to working with you, First_Name.']);

  // The import event: counts and family labels only.
  const imported = events.filter((e) => e.event === 'template_fields_imported');
  expect(imported).toEqual([{ event: 'template_fields_imported', data: { count: 6, families: { mergefield: 6 } }, timestamp: expect.any(Number) }]);

  const docs = await mergeAndDownload(page, 'word-mergefield');
  record('word-mergefield', { dialogText, rows, docs });
  expect(docs).toHaveLength(2);
  expect(docs[0]['word/document.xml']).toBe(
    'Dear Anna Ozola / Your contract starts on 1 December 2026 at a monthly fee of 1,250.00 EUR. / Dear Ms, we look forward to working with you, Anna. / Delivery to Riga.');
  expect(docs[1]['word/document.xml']).toContain('Dear Mr, we look forward to working with you, Janis.');
  expectClean(docs);
});

test('\\b and \\f text with leading punctuation is kept exactly in the editor, the preview and the output', async ({ page }) => {
  await upload(page, 'word-mergefield-punctuation');
  await expect(dialog(page)).toBeVisible();
  expect(await dialogRows(page)).toEqual([
    { name: 'Title', family: 'mergefield', checked: true },
    { name: 'Code', family: 'mergefield', checked: true },
  ]);
  await dialog(page).getByRole('button', { name: 'Add 2 fields' }).click();
  await expect(page.getByText(/Fields \(2\)/)).toBeVisible();
  const fields = [...await renderedParagraphs(page, 'look forward'), ...await renderedParagraphs(page, 'Reference')];
  expect(fields).toEqual(['Dear Title, we look forward to seeing you.', 'Reference (Code), "as agreed"; see C:\\Files.']);

  await page.getByRole('button', { name: 'Add your data' }).last().click();
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, 'word-mergefield-punctuation.xlsx'));
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible();
  const preview = await renderedParagraphs(page, 'look forward');
  expect(preview.length).toBeGreaterThan(0);
  for (const line of preview) expect(line).toBe('Dear Ms, we look forward to seeing you.');

  await page.getByRole('button', { name: /^Generate/ }).click();
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Download Word files' }).first().click();
  const zip = await JSZip.loadAsync(fs.readFileSync((await (await downloadPromise).path())!));
  const docs: Record<string, string>[] = [];
  for (const name of Object.keys(zip.files).filter((n) => n.endsWith('.docx')).sort()) docs.push(await partsText(await zip.file(name)!.async('nodebuffer')));
  record('word-mergefield-punctuation', { fields, preview, docs });
  expect(docs.map((d) => d['word/document.xml']).sort()).toEqual([
    'Dear Mr, we look forward to seeing you. / Reference (Y2), "as agreed"; see C:\\Files.',
    'Dear Ms, we look forward to seeing you. / Reference (X1), "as agreed"; see C:\\Files.',
  ]);
  expectClean(docs);
});

test('MERGEFIELDs in a header and a footer, {{ }} in a fourth header: import and merge into those parts', async ({ page }) => {
  await upload(page, 'word-mergefield-header');
  await expect(dialog(page)).toBeVisible();
  const rows = await dialogRows(page);
  expect(rows).toEqual([
    { name: 'Company', family: 'mergefield', checked: true },
    { name: 'Department', family: 'doubleBrace', checked: true },
    { name: 'Reference_No', family: 'mergefield', checked: true },
  ]);
  await expect(dialog(page)).toContainText('in a header');
  await expect(dialog(page)).toContainText('in a footer');
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  await expect(page.getByText(/Fields \(3\)/)).toBeVisible();
  await expect(page.getByTestId('field-outside-body')).toHaveCount(3);
  await expect(page.getByTestId('field-outside-body').first()).toHaveText('in header/footer');

  const docs = await mergeAndDownload(page, 'word-mergefield-header');
  record('word-mergefield-header', { dialogText, rows, docs });
  expect(docs[0]['word/header1.xml']).toBe('Prepared for Acme SIA');
  expect(docs[0]['word/footer1.xml']).toBe('Ref. R-1001');
  expect(docs[0]['word/header4.xml']).toBe('Department: Sales');
  expect(docs[1]['word/header1.xml']).toBe('Prepared for Baltic Ltd');
  expect(docs[1]['word/footer1.xml']).toBe('Ref. R-1002');
  expect(docs[1]['word/header4.xml']).toBe('Department: Support');
  expectClean(docs);
});

test('renaming an imported header field writes the new name into the header and merges', async ({ page }) => {
  await upload(page, 'word-mergefield-header');
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  // Clicking a field's name in the Fields panel starts renaming it.
  await page.getByText('Company', { exact: true }).click();
  const input = page.getByRole('textbox', { name: /name/i });
  await input.fill('Firm');
  await input.press('Enter');
  await expect(page.getByText('Firm', { exact: true })).toBeVisible();

  // The user's own tagged template, as "Download > Template" gives it.
  await page.getByRole('button', { name: 'Download' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^Template/ }).click();
  const tagged = fs.readFileSync((await (await downloadPromise).path())!);
  const zip = await JSZip.loadAsync(tagged);
  expect(await zip.file('word/header1.xml')!.async('string')).toContain('{{Firm}}');

  const ab = tagged.buffer.slice(tagged.byteOffset, tagged.byteOffset + tagged.byteLength) as ArrayBuffer;
  const fields = ['Firm', 'Reference_No', 'Department'].map((name, i) => ({ id: name, name, originalText: `{{${name}}}`, colorIndex: i, occurrences: [] }));
  const blob = generateDocument(ab, { Firm: 'Acme SIA', Reference_No: 'R-1', Department: 'Sales' },
    { Firm: 'Firm', Reference_No: 'Reference_No', Department: 'Department' }, fields);
  const out = await partsText(Buffer.from(await blob.arrayBuffer()));
  record('rename-header', { out });
  expect(out['word/header1.xml']).toBe('Prepared for Acme SIA');
  expect(out['word/footer1.xml']).toBe('Ref. R-1');
  expect(out['word/header4.xml']).toBe('Department: Sales');
});

test('<< Name >> chevrons, one split across runs: offered ticked, merge', async ({ page }) => {
  await upload(page, 'chevron');
  const rows = await dialogRows(page);
  expect(rows).toEqual([
    { name: 'Name', family: 'chevron', checked: true },
    { name: 'Address', family: 'chevron', checked: true },
    { name: 'Date', family: 'chevron', checked: true },
  ]);
  await expect(dialog(page).getByTestId('import-row').first()).toContainText('2 places');
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  const docs = await mergeAndDownload(page, 'chevron');
  record('chevron', { dialogText, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Hello Anna, / We will ship to Brivibas 1 on 1 Dec. / Regards, Anna');
  expectClean(docs);
});

test('{{ Customer }} with spaces and {{Customer}} in a header: offered, merge without stray braces', async ({ page }) => {
  await upload(page, 'double-brace');
  await expect(dialog(page)).toBeVisible();
  // Exact {{Name}} in the body is Veidne's own form: already a field.
  await expect(dialog(page).getByTestId('import-auto')).toHaveText('Already Veidne fields: Invoice_No, Due Date.');
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Customer', family: 'doubleBrace', checked: true }]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 1 field' }).click();
  await expect(page.getByText(/Fields \(3\)/)).toBeVisible();
  const docs = await mergeAndDownload(page, 'double-brace');
  record('double-brace', { dialogText, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Customer: Acme SIA / Invoice INV-1 due 30 Nov.');
  expect(docs[0]['word/header1.xml']).toBe('Invoice for Acme SIA');
  expectClean(docs);
});

test('{ Name } single braces: offered unticked, merge once ticked', async ({ page }) => {
  await upload(page, 'single-brace');
  const rows = await dialogRows(page);
  expect(rows).toEqual(['Name', 'Order_No', 'City'].map((name) => ({ name, family: 'singleBrace', checked: false })));
  await expect(dialog(page).getByRole('button', { name: /^Add \d+ fields?$/ })).toBeDisabled();
  await expect(dialog(page)).toContainText('Often ordinary text');
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Select all' }).click();
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  const docs = await mergeAndDownload(page, 'single-brace');
  record('single-brace', { dialogText, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Dear Anna, / Your order A-1 ships to Riga.');
  expectClean(docs);
});

test('% Name % percent delimiters next to a real percentage: offered unticked, merge once ticked', async ({ page }) => {
  await upload(page, 'percent');
  const rows = await dialogRows(page);
  expect(rows).toEqual(['Name', 'Order_No', 'City'].map((name) => ({ name, family: 'percent', checked: false })));
  const dialogText = await dialog(page).innerText();
  await tick(page, 'Name');
  await tick(page, 'Order_No');
  await tick(page, 'City');
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  const docs = await mergeAndDownload(page, 'percent');
  record('percent', { dialogText, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Dear Anna, / You saved 15% on order A-1 shipped to Riga.');
});

test('«Name» and ${Code}: offered ticked, merge', async ({ page }) => {
  await upload(page, 'guillemet-dollar');
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Name', family: 'guillemet', checked: true }, { name: 'Code', family: 'dollarBrace', checked: true }]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 2 fields' }).click();
  const docs = await mergeAndDownload(page, 'guillemet-dollar');
  record('guillemet-dollar', { dialogText, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Dear Anna, / Your code is X1.');
  expectClean(docs);
});

// ── Control structures ──────────────────────────────────────────────────────

/** A blocked template: the notice stays, Generate is refused with the reason
 *  and never starts a run. */
async function expectBlocked(page: Page, fixture: string, events: { event: string }[]): Promise<string> {
  const notice = page.getByTestId('template-controls-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-step', 'fields');
  await expect(notice).toContainText('Generate is blocked for this template');
  // The Data step says so before any data is added, and so does the preview.
  await page.getByRole('button', { name: 'Add your data' }).last().click();
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-step', 'data');
  await expect(notice).toContainText('Generate is blocked for this template');
  await expect(notice).toContainText('adding data here will not get you documents yet');
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, `${fixture}.xlsx`));
  await page.getByRole('button', { name: 'Looks good' }).click();
  await expect(page.getByRole('button', { name: /^Generate/ })).toBeVisible();
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-step', 'data');
  await page.getByRole('button', { name: /^Generate/ }).click();
  const panel = page.getByTestId('generate-error');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('generate-error-cause')).toContainText('one document per spreadsheet row');
  await expect(page.getByRole('button', { name: 'Download Word files' })).toHaveCount(0);
  expect(events.filter((e) => e.event === 'generate_started')).toHaveLength(0);
  return panel.innerText();
}

test('{{#each}} around part of the body: explained at upload, simple field offered, Generate refused', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'handlebars-each');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByTestId('import-controls')).toContainText('{{#each rows}}');
  await expect(dialog(page).getByTestId('import-controls')).toContainText('Veidne makes one document per spreadsheet row');
  await expect(dialog(page).getByRole('button', { name: 'Remove the two tags' })).toHaveCount(0);
  await expect(dialog(page).getByTestId('import-auto')).toHaveText('Already a Veidne field: Customer.');
  // {{name}} and {{amount}} inside the loop are not offered as fields.
  expect(await dialogRows(page)).toEqual([]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/Fields \(1\)/)).toBeVisible();
  const notice = await page.getByTestId('template-controls-notice').innerText();
  const panel = await expectBlocked(page, 'handlebars-each', events);
  record('handlebars-each', { dialogText, notice, panel });
});

test('{{#each}} around the whole body: removing the two tags, then importing, merges correctly', async ({ page }) => {
  await upload(page, 'handlebars-each-whole');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('Everything in this document is inside one repeating section, from {{#each rows}} to {{/each}}');
  const before = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Remove the two tags' }).click();
  await expect(dialog(page).getByTestId('import-loop-removed')).toBeVisible();
  await expect(dialog(page).getByTestId('import-controls')).toHaveCount(0);
  await expect(dialog(page).getByTestId('import-auto')).toHaveText('Already a Veidne field: Name.');
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Balance', family: 'doubleBrace', checked: true }]);
  const after = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 1 field' }).click();
  await expect(page.getByTestId('template-controls-notice')).toHaveCount(0);
  const docs = await mergeAndDownload(page, 'handlebars-each-whole');
  record('handlebars-each-whole', { before, after, rows, docs });
  expect(docs[0]['word/document.xml']).toBe('Dear Anna, / Your balance is 120.00 EUR.');
  expect(docs[1]['word/document.xml']).toBe('Dear Janis, / Your balance is 75.50 EUR.');
  expectClean(docs);
});

test('{{#each}} in a header: explained at upload (no longer a compile error), Generate refused', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'handlebars-each-header');
  await expect(dialog(page).getByTestId('import-controls')).toContainText('{{#each rows}}');
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Continue' }).click();
  const panel = await expectBlocked(page, 'handlebars-each-header', events);
  record('handlebars-each-header', { dialogText, panel });
});

test('docxtemplater {#items} loop: explained, {Customer} offered unticked, Generate refused', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'docxtemplater-loop');
  await expect(dialog(page).getByTestId('import-controls')).toContainText('{#items}');
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Customer', family: 'singleBrace', checked: false }]);
  const dialogText = await dialog(page).innerText();
  await tick(page, 'Customer');
  await dialog(page).getByRole('button', { name: 'Add 1 field' }).click();
  const panel = await expectBlocked(page, 'docxtemplater-loop', events);
  record('docxtemplater-loop', { dialogText, rows, panel });
});

test('Jinja {% for %}: explained, {{ Customer }} offered ticked, Generate refused', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'jinja-for');
  await expect(dialog(page).getByTestId('import-controls')).toContainText('{% for line in lines %}');
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Customer', family: 'doubleBrace', checked: true }]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 1 field' }).click();
  const panel = await expectBlocked(page, 'jinja-for', events);
  record('jinja-for', { dialogText, rows, panel });
});

test('Word IF / NEXT / NEXTIF / SKIPIF / MERGEREC / MERGESEQ: controls, not fields; Generate refused', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'word-control-fields');
  const controls = dialog(page).getByTestId('import-controls');
  await expect(controls).toContainText('Word IF field');
  await expect(controls).toContainText('Word NEXTIF field');
  // Gender, Region and Active are inside the IF/NEXTIF/SKIPIF codes: not offered.
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'Surname', family: 'mergefield', checked: true }]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Add 1 field' }).click();
  await expect(page.getByText(/Fields \(1\)/)).toBeVisible();
  const panel = await expectBlocked(page, 'word-control-fields', events);
  record('word-control-fields', { dialogText, rows, panel });
});

// ── Negatives ───────────────────────────────────────────────────────────────

test('plain document: no import step, "click any word" flow as before, merges', async ({ page }) => {
  await upload(page, 'plain');
  await expect(page.getByTestId('document-area')).toBeVisible();
  await expect(page.getByText(/Fields \(0\)/)).toBeVisible();
  await expect(page.getByText('No fields yet. Click any word')).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByText('customer,', { exact: true }).click();
  const input = page.getByRole('textbox');
  await input.fill('Name');
  await input.press('Enter');
  await expect(page.getByText(/Fields \(1\)/)).toBeVisible();
  const docs = await mergeAndDownload(page, 'plain');
  record('plain', { docs });
  expect(docs[0]['word/document.xml']).toBe('Dear Anna, / Thank you for your order. It will arrive within five working days. / Kind regards, the team');
});

test('prose with braces and percent signs: two unticked candidates, nothing changes, literal text survives', async ({ page }) => {
  await upload(page, 'prose-braces-percent');
  await expect(dialog(page)).toBeVisible();
  const rows = await dialogRows(page);
  expect(rows).toEqual([{ name: 'PATH', family: 'percent', checked: false }, { name: 'APPDATA', family: 'percent', checked: false }]);
  const dialogText = await dialog(page).innerText();
  await dialog(page).getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText(/Fields \(0\)/)).toBeVisible();
  await page.getByText('respondents', { exact: true }).click();
  const input = page.getByRole('textbox');
  await input.fill('Name');
  await input.press('Enter');
  const docs = await mergeAndDownload(page, 'prose-braces-percent');
  record('prose-braces-percent', { dialogText, rows, docs });
  const text = docs[0]['word/document.xml'];
  expect(text).toContain('Between 40% and 60% of Anna agreed;');
  expect(text).toContain('The set {1, 2, 3} has three members, and { x } is the variable.');
  expect(text).toContain('Configuration: { "name": "Anna", "retries": 3 }.');
  expect(text).toContain('Use %PATH% and %APPDATA% on Windows; the rate is 3.5%.');
  expect(text).toContain('Margin notes: {see appendix} and {sic}.');
});

// ── Generate in-flight guard ────────────────────────────────────────────────

test('six rapid Generate clicks start one run and report one generate_started', async ({ page }) => {
  const events = await captureAnalytics(page);
  await upload(page, 'chevron');
  await dialog(page).getByRole('button', { name: 'Add 3 fields' }).click();
  await page.getByRole('button', { name: 'Add your data' }).last().click();
  await page.locator('input[type="file"]').setInputFiles(path.join(DIR, 'chevron.xlsx'));
  await page.getByRole('button', { name: 'Looks good' }).click();
  const generate = page.getByRole('button', { name: /^Generate/ });
  await expect(generate).toBeVisible();
  // Six clicks in one task, before React re-renders or the overlay opens.
  await generate.evaluate((b: HTMLButtonElement) => { for (let i = 0; i < 6; i++) b.click(); });
  await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => events.filter((e) => e.event === 'generate_completed').length).toBe(1);
  expect(events.filter((e) => e.event === 'generate_started')).toHaveLength(1);
  expect(events.filter((e) => e.event === 'generate_failed')).toHaveLength(0);
});
