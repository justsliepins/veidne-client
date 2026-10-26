import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { parseExcel } from '../src/features/data/utils/excelParser';

// Parse-level regression spec for number-format rendering, dot-separated
// Latvian date formats (dd.mm.yyyy) in particular: SheetJS 0.18.5's SSF parses
// an unquoted dot in a date format as a sub-second token and silently falls
// back to the raw serial ("45710"). Runs entirely in Node — no browser.

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function parseFixture(name: string) {
  const buf = fs.readFileSync(path.join(FIXTURES, name));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parseExcel(ab as ArrayBuffer);
}

function column(rows: Record<string, string>[], key: string): string[] {
  return rows.map((r) => r[key]);
}

test('lv-dates file: dd.mm.yyyy dates render with dots; other columns unchanged', () => {
  const { rows } = parseFixture('veidne-format-test-data-lv-dates.xlsx');
  expect(rows).toHaveLength(3);
  expect(column(rows, 'TRUEDATE')).toEqual(['22.02.2025', '05.03.2025', '31.12.2025']);
  expect(column(rows, 'NAME')).toEqual(['Anna Ozola', 'Jānis Bērziņš', 'Līga Žagata']);
  expect(column(rows, 'ZIP')).toEqual(['02451', '00070', '00905']);
  expect(column(rows, 'AMOUNT')).toEqual(['$2,283.11', '$945.50', '$12,000.00']);
  expect(column(rows, 'PERCENT')).toEqual(['30.0%', '12.5%', '100.0%']);
  expect(column(rows, 'EURO')).toEqual(['1,500.00 €', '99.90 €', '2,500.55 €']);
});

test('slash-date file: dd/mm/yyyy dates still render (regression guard)', () => {
  const { rows } = parseFixture('veidne-format-test-data.xlsx');
  expect(rows).toHaveLength(3);
  expect(column(rows, 'TRUEDATE')).toEqual(['22/02/2025', '05/03/2025', '31/12/2025']);
  expect(column(rows, 'NAME')).toEqual(['Anna Ozola', 'Jānis Bērziņš', 'Līga Žagata']);
  expect(column(rows, 'ZIP')).toEqual(['02451', '00070', '00905']);
  expect(column(rows, 'AMOUNT')).toEqual(['$2,283.11', '$945.50', '$12,000.00']);
  expect(column(rows, 'PERCENT')).toEqual(['30.0%', '12.5%', '100.0%']);
  expect(column(rows, 'EURO')).toEqual(['1,500.00 €', '99.90 €', '2,500.55 €']);
});

test('sanity file: dotted date variants render; numeric decimals untouched', () => {
  const { rows } = parseFixture('veidne-format-test-sanity-formats.xlsx');
  expect(rows[0]['DMYY']).toBe('22.2.25'); // d.m.yy
  expect(rows[0]['DOTTIME']).toBe('22.02.2025 09:05'); // dd.mm.yyyy hh:mm
  expect(rows[0]['DECIMAL']).toBe('1234.50'); // 0.00 — decimal dot must NOT be quoted
  expect(rows[0]['PCT']).toBe('7.5%'); // 0.0%
});

test('hostile file: bracketed sections, conditions and non-date dots survive', () => {
  const { rows } = parseFixture('veidne-hostile-formats.xlsx');
  expect(rows[0]['REDCOND']).toBe('0.50'); // [Red]0.00 — "d" in Red is not a date token
  expect(rows[0]['SECTIONS']).toBe('-1,234.50'); // #,##0.00;[Red]-#,##0.00
  expect(rows[0]['CURRLOC']).toContain('1,500.00'); // [$€-426] #,##0.00
  expect(rows[0]['DOTYMD']).toBe('2025.02.22'); // yyyy.mm.dd
  expect(rows[0]['AMPM']).toBe('2:30 PM'); // h:mm AM/PM
  expect(rows[0]['ELAPSED']).toBe('36:00'); // [h]:mm elapsed hours
});
