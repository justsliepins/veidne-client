import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { test, expect, type Page } from '@playwright/test';
import { parseExcel } from '../src/features/data/utils/excelParser';
import {
  DATE_STYLES,
  NUMBER_STYLES,
  guessFormatConventions,
  type FormatConventions,
} from '../src/features/data/utils/localeFormats';

// Regional date and number styles (audit nov 2026, finding 2). A date typed
// into Excel gets built-in format 14, which Excel shows in the computer's own
// short date style and SheetJS as m/d/yy; Excel also swaps every number
// separator for the system's. The fixture comes from
// e2e/fixtures/make-locale-formats-fixture.mjs. The parse-level tests run in
// Node; the flow tests run against the dark-launch server like date-formats.
const BASE = 'http://localhost:5181';
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const TEMPLATE = path.join(FIXTURES, 'veidne-format-test-template.docx');
const DATA = path.join(FIXTURES, 'veidne-locale-formats.xlsx');
const NB = '\u00A0';
const LV: FormatConventions = { date: 'dmy-dot', number: 'space-comma' };
const US: FormatConventions = { date: 'mdy-slash', number: 'comma-dot' };

function parseFixture(name: string, conventions?: FormatConventions) {
  const buf = fs.readFileSync(path.join(FIXTURES, name));
  return parseExcel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, conventions);
}
const column = (rows: Record<string, string>[], key: string) => rows.map((r) => r[key]);

test.describe('parse level', () => {
  test('format 14 and 22 follow the chosen date style; explicit codes do not', () => {
    const lv = parseFixture('veidne-locale-formats.xlsx', LV).rows;
    expect(column(lv, 'TRUEDATE')).toEqual(['14.11.2026', '05.03.2026', '31.12.2025']);
    expect(column(lv, 'DATETIME')).toEqual(['14.11.2026 9:30', '05.03.2026 17:05', '31.12.2025 0:00']);
    expect(column(lv, 'CUSTOMDOT')).toEqual(['14.11.2026', '05.03.2026', '31.12.2025']);
    expect(column(lv, 'CUSTOMMDY')).toEqual(['11/14/26', '3/5/26', '12/31/25']); // custom m/d/yy is not format 14
    expect(column(lv, 'LONGDATE')).toEqual(['Saturday, November 14, 2026', 'Thursday, March 05, 2026', 'Wednesday, December 31, 2025']);
    expect(column(lv, 'TIME')).toEqual(['9:30', '17:05', '0:00']);
    const us = parseFixture('veidne-locale-formats.xlsx', US).rows;
    expect(column(us, 'TRUEDATE')).toEqual(['11/14/2026', '3/5/2026', '12/31/2025']);
    expect(column(us, 'DATETIME')).toEqual(['11/14/2026 9:30', '3/5/2026 17:05', '12/31/2025 0:00']);
    const t = (date: FormatConventions['date']) => column(parseFixture('veidne-locale-formats.xlsx', { date, number: 'comma-dot' }).rows, 'TRUEDATE');
    expect(t('dmy-dot-end')).toEqual(['14.11.2026.', '05.03.2026.', '31.12.2025.']);
    expect(t('dmy-slash')).toEqual(['14/11/2026', '05/03/2026', '31/12/2025']);
    expect(t('ymd-dash')).toEqual(['2026-11-14', '2026-03-05', '2025-12-31']);
  });

  test('number separators follow the chosen style; text and leading zeros do not', () => {
    const lv = parseFixture('veidne-locale-formats.xlsx', LV).rows;
    expect(column(lv, 'AMOUNT')).toEqual([`1${NB}234,50`, '945,50', `1${NB}234${NB}567,89`]);
    expect(column(lv, 'INTEGER')).toEqual([`1${NB}235`, '7', `1${NB}000${NB}000`]);
    expect(column(lv, 'DECIMAL')).toEqual(['1234,50', '0,50', '12,00']);
    expect(column(lv, 'PERCENT')).toEqual(['12,50%', '30,00%', '100,00%']);
    expect(column(lv, 'GENERAL')).toEqual(['1234,5', '0,75', '2026']);
    expect(column(lv, 'EURO')).toEqual([`1${NB}500,00 €`, '99,90 €', `2${NB}500,55 €`]);
    expect(column(lv, 'EURLOC')).toEqual([`€ 1${NB}500,00`, '€ 99,90', `€ 2${NB}500,55`]);
    expect(column(lv, 'ACC44')).toEqual([` 1${NB}234,50 € `, ' -   € ', '-50,00 € ']);
    expect(column(lv, 'NEGATIVE')).toEqual([`-1${NB}234,50`, '3,25', '0,00']);
    expect(column(lv, 'ZIP')).toEqual(['02451', '00070', '00905']);
    expect(column(lv, 'TEXTNUM')).toEqual(['1,234.50', '02.03.2026', '1 234,50']);
    const de = parseFixture('veidne-locale-formats.xlsx', { date: 'dmy-dot', number: 'dot-comma' }).rows;
    expect(column(de, 'AMOUNT')).toEqual(['1.234,50', '945,50', '1.234.567,89']);
  });

  test('the regional columns and column names are the same in every style', () => {
    const want = {
      dates: ['TRUEDATE', 'DATETIME'],
      numbers: ['AMOUNT', 'PERCENT', 'EURO', 'INTEGER', 'DECIMAL', 'GENERAL', 'EURLOC', 'ACC44', 'NEGATIVE'],
    };
    const plain = parseFixture('veidne-locale-formats.xlsx');
    expect(plain.regional).toEqual(want);
    for (const date of DATE_STYLES) for (const number of NUMBER_STYLES) {
      const p = parseFixture('veidne-locale-formats.xlsx', { date, number });
      expect(p.regional).toEqual(want);
      expect(p.columns).toEqual(plain.columns);
    }
    expect(plain.columns.at(-1)).toBe('11/14/26'); // a date header keeps SheetJS's text
  });

  test('without a style the parser gives SheetJS text, as before (regression guard)', () => {
    const plain = parseFixture('veidne-locale-formats.xlsx').rows;
    expect(column(plain, 'TRUEDATE')).toEqual(['11/14/26', '3/5/26', '12/31/25']);
    expect(column(plain, 'AMOUNT')).toEqual(['1,234.50', '945.50', '1,234,567.89']);
    // The committed fixtures: US style equals no style, and their explicit
    // date codes never change in any style.
    for (const name of ['veidne-format-test-data.xlsx', 'veidne-format-test-data-lv-dates.xlsx', 'veidne-format-test-sanity-formats.xlsx', 'veidne-hostile-formats.xlsx', 'veidne-image-test-data.xlsx']) {
      expect(parseFixture(name, US).rows, name).toEqual(parseFixture(name).rows);
    }
    for (const date of DATE_STYLES) for (const number of NUMBER_STYLES) {
      expect(column(parseFixture('veidne-format-test-data-lv-dates.xlsx', { date, number }).rows, 'TRUEDATE')).toEqual(['22.02.2025', '05.03.2025', '31.12.2025']);
      expect(column(parseFixture('veidne-format-test-data.xlsx', { date, number }).rows, 'TRUEDATE')).toEqual(['22/02/2025', '05/03/2025', '31/12/2025']);
    }
    expect(parseFixture('veidne-image-test-data.xlsx').regional).toEqual({ dates: [], numbers: [] });
  });

  test('the guess: a Latvian language or the Riga time zone wins, then the first known language', () => {
    expect(guessFormatConventions(['lv-LV'])).toEqual(LV);
    expect(guessFormatConventions(['en-US', 'en', 'lv'])).toEqual(LV);
    expect(guessFormatConventions(['en-US', 'en'], 'Europe/Riga')).toEqual(LV);
    expect(guessFormatConventions(['en-US', 'en'], 'UTC')).toEqual(US);
    expect(guessFormatConventions(['en-GB'])).toEqual({ date: 'dmy-slash', number: 'comma-dot' });
    expect(guessFormatConventions(['de-DE', 'en'])).toEqual({ date: 'dmy-dot', number: 'dot-comma' });
    expect(guessFormatConventions([])).toEqual(US);
  });
});

async function normalizedText(page: Page, testId: string): Promise<string> {
  const raw = await page.getByTestId(testId).innerText();
  return raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
}

async function expectInBothPreviews(page: Page, sub: string): Promise<void> {
  await expect.poll(() => normalizedText(page, 'document-area'), { message: `main preview should contain: ${sub}` }).toContain(sub);
  await expect.poll(() => normalizedText(page, 'preview-panel-doc'), { message: `side preview should contain: ${sub}` }).toContain(sub);
}

// From the upload screen to the mapping dialog. `entry` with a flow parameter
// starts fresh even when this browser holds a saved session.
async function openMapping(page: Page, data: string | { name: string; mimeType: string; buffer: Buffer }, entry = '/start'): Promise<void> {
  await page.goto(`${BASE}${entry}`);
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await page.getByRole('button', { name: 'Add your data' }).click();
  await page.locator('input[type="file"]').setInputFiles(data);
  await expect(page.getByRole('dialog')).toBeVisible();
}

// The table row of one spreadsheet column in the mapping dialog.
const mappingRow = (page: Page, col: string) => page.getByRole('dialog').locator(`span[title="${col}"]`).locator('..');

test.describe('lv-LV browser', () => {
  test.use({ locale: 'lv-LV' });

  test('Cancel in the column dialog puts back the date style it opened with', async ({ page }) => {
    await openMapping(page, DATA);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radiogroup', { name: 'Dates look like' }).getByRole('radio', { name: '2026-11-14' }).check();
    await expect(mappingRow(page, 'TRUEDATE')).toContainText('2026-11-14');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Nothing was stored, and the next list opens with the guess again.
    expect(await page.evaluate(() => localStorage.getItem('veidne_formatConventions'))).toBeNull();
    await page.getByRole('button', { name: 'Add your data' }).click();
    await page.locator('input[type="file"]').setInputFiles(DATA);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('radiogroup', { name: 'Dates look like' }).getByRole('radio', { name: '14.11.2026', exact: true })).toBeChecked();
  });

  test('Latvian guess: preview, documents and file names use 14.11.2026 and 1 234,50', async ({ page }) => {
    await openMapping(page, DATA);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText("Check how your Excel shows dates and numbers")).toBeVisible();
    await expect(dialog.getByText('Choose what Excel shows for TRUEDATE, DATETIME, AMOUNT and 8 more. The preview, the documents and the file names all use it.')).toBeVisible();
    const dates = dialog.getByRole('radiogroup', { name: 'Dates look like' });
    const numbers = dialog.getByRole('radiogroup', { name: 'Numbers look like' });
    await expect(dates.getByRole('radio', { name: '14.11.2026', exact: true })).toBeChecked();
    await expect(numbers.getByRole('radio', { name: /^1\s234,50$/ })).toBeChecked();
    await expect(mappingRow(page, 'TRUEDATE')).toContainText('14.11.2026');
    await expect(mappingRow(page, 'AMOUNT')).toContainText(/1\s234,50/);

    // A different style shows in the table at once; back to the guess.
    await dates.getByRole('radio', { name: '2026-11-14' }).check();
    await expect(mappingRow(page, 'TRUEDATE')).toContainText('2026-11-14');
    await dates.getByRole('radio', { name: '14.11.2026', exact: true }).check();
    await expect(mappingRow(page, 'TRUEDATE')).toContainText('14.11.2026');

    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
    await expectInBothPreviews(page, 'Riga, 14.11.2026');
    await expectInBothPreviews(page, 'reimbursement of 1 234,50, a deposit refund of 1 500,00 €, and an adjustment of 12,50%, as agreed');
    await expect(page.getByTestId('regional-format-bar')).toContainText(/Dates look like 14\.11\.2026 and numbers like 1\s234,50\./);

    // File names come from the same text.
    await page.getByLabel('Name files by').click();
    await page.getByRole('option', { name: 'TRUEDATE' }).click();
    await expect(page.getByText('14.11.2026.docx', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Generate/ }).click();
    await expect(page.getByRole('button', { name: 'Download Word files' })).toBeVisible({ timeout: 30_000 });
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByText('14.11.2026.docx', { exact: true }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('14.11.2026.docx');
    const docx = await JSZip.loadAsync(fs.readFileSync((await download.path())!));
    const xml = await docx.file('word/document.xml')!.async('string');
    const text = Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('');
    expect(text).toContain('Riga, 14.11.2026');
    expect(text).toContain(`reimbursement of 1${NB}234,50, a deposit refund of 1${NB}500,00 €`);
  });
});

test.describe('en-US browser', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });

  test('US guess; a new style picked in the preview bar applies at once and is remembered', async ({ page }) => {
    await openMapping(page, DATA);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radiogroup', { name: 'Dates look like' }).getByRole('radio', { name: '11/14/2026' })).toBeChecked();
    await expect(dialog.getByRole('radiogroup', { name: 'Numbers look like' }).getByRole('radio', { name: '1,234.50' })).toBeChecked();
    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
    await expectInBothPreviews(page, 'Riga, 11/14/2026');
    await expectInBothPreviews(page, 'reimbursement of 1,234.50, a deposit refund of 1,500.00 €');

    const bar = page.getByTestId('regional-format-bar');
    await expect(bar).toContainText('Dates look like 11/14/2026 and numbers like 1,234.50.');
    await bar.getByRole('button', { name: 'Change how dates and numbers look' }).click();
    await bar.getByRole('radiogroup', { name: 'Dates look like' }).getByRole('radio', { name: '14.11.2026', exact: true }).check();
    await bar.getByRole('radiogroup', { name: 'Numbers look like' }).getByRole('radio', { name: /^1\s234,50$/ }).check();
    await expectInBothPreviews(page, 'Riga, 14.11.2026');
    await expectInBothPreviews(page, 'reimbursement of 1 234,50, a deposit refund of 1 500,00 €');
    await expect(bar).toContainText(/Dates look like 14\.11\.2026 and numbers like 1\s234,50\./);
    await bar.getByRole('button', { name: 'Done' }).click();
    await expect(bar.getByRole('radiogroup')).toHaveCount(0);

    // Remembered in this browser only, then used for the next spreadsheet.
    expect(await page.evaluate(() => localStorage.getItem('veidne_formatConventions'))).toBe('{"v":1,"date":"dmy-dot","number":"space-comma"}');
    page.on('dialog', (d) => void d.accept()); // the leave-page warning
    await openMapping(page, DATA, '/editor?flow=template-data');
    await expect(page.getByRole('dialog').getByRole('radio', { name: '14.11.2026', exact: true })).toBeChecked();
  });

  test('a spreadsheet with no regional values shows no choice', async ({ page }) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ NAME: 'Anna Ozola', TRUEDATE: '14.11.2026', ZIP: '02451', AMOUNT: '1 234,50', PERCENT: '12%', EURO: '1 500,00 €', TEXTDATE: 'today' }]), 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await openMapping(page, { name: 'text-only.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
    await expect(page.getByRole('dialog').getByText('Dates look like')).toHaveCount(0);
    await page.getByRole('button', { name: 'Looks good' }).click();
    await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('regional-format-bar')).toHaveCount(0);
  });
});

test.describe('phone, 390 px', () => {
  test.use({ locale: 'lv-LV', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the line sits in the preview panel, which covers the document column on phones', async ({ page }) => {
    await openMapping(page, DATA);
    const latvian = page.getByRole('dialog').getByRole('radio', { name: '14.11.2026', exact: true });
    await expect(latvian).toBeChecked();
    // A 44 px row per option (polled: the dialog scales in when it opens).
    await expect.poll(async () => (await latvian.locator('xpath=ancestor::span[1]').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Looks good' }).click();
    const card = page.getByTestId('regional-format-card');
    await expect(card).toContainText(/Dates look like 14\.11\.2026 and numbers like 1\s234,50\./, { timeout: 15_000 });
    await expect(page.getByTestId('regional-format-bar')).toBeHidden();
    await card.getByRole('button', { name: 'Change how dates and numbers look' }).click();
    await card.getByRole('radio', { name: '14/11/2026' }).check();
    await expect(card).toContainText('Dates look like 14/11/2026');
    await expect.poll(() => normalizedText(page, 'preview-panel-doc')).toContain('Riga, 14/11/2026');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
