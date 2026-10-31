import * as XLSX from 'xlsx';
import {
  DATE_STYLE_CODES,
  DATE_TIME_SUFFIX,
  hasNumberSeparators,
  localizeNumberText,
  type FormatConventions,
} from './localeFormats';

/** Columns whose text follows the computer's regional settings in Excel. */
export interface RegionalColumns {
  /** Columns with a date in Excel's built-in short date (format 14 or 22). */
  dates: string[];
  /** Columns with a number that has a thousands or decimal separator. */
  numbers: string[];
}

export interface ParsedExcel {
  columns: string[];
  rows: Record<string, string>[];
  /** Same for every `conventions` value, so the choice can be shown before
   *  it is made. Empty lists when nothing depends on regional settings. */
  regional: RegionalColumns;
}

// Built-in format 14 is the short date: Excel shows it in the computer's own
// date style, SheetJS as m/d/yy. SheetJS's dateNF read option replaces the
// code used for format 14 only, so a marker in it finds exactly those cells (a
// custom code that happens to read m/d/yy keeps its own id and is left alone).
const SHORT_DATE_MARK = '\uE000'; // a private-use character, never in real text
const SHORT_DATE_PROBE = `"${SHORT_DATE_MARK}"yyyy-mm-dd`;
/** What SheetJS writes for format 14 without the probe. */
const SHEETJS_SHORT_DATE = 'm/d/yy';
/** SheetJS's code for built-in 22. Matched by text: a custom code that reads
 *  exactly the same is treated as 22 too (Excel writes 22 for a typed date and time). */
const SHEETJS_SHORT_DATE_TIME = 'm/d/yy h:mm';

// True when a number format is a date/time format: any unquoted/unescaped
// d/m/y/h/s token counts, plus elapsed-time brackets like [h] or [mm].
// Bracketed sections such as [Red] or [$€-426] are skipped, so the "d" in
// "Red" does not classify a numeric format as a date.
function isDateFormat(z: string): boolean {
  let inQuotes = false;
  for (let i = 0; i < z.length; i++) {
    const c = z[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    if (c === '\\' || c === '_' || c === '*') { i++; continue; }
    if (c === '[') {
      const j = z.indexOf(']', i);
      const inner = (j > i ? z.slice(i + 1, j) : '').toLowerCase();
      if (/^[hms]+$/.test(inner)) return true;
      i = j > i ? j : i;
      continue;
    }
    if ('dmyhsDMYHS'.includes(c)) return true;
  }
  return false;
}

// Wrap every unquoted dot as a literal "." (quoted runs, escapes and bracketed
// sections are passed through untouched).
function quoteUnquotedDots(z: string): string {
  let out = '';
  let inQuotes = false;
  for (let i = 0; i < z.length; i++) {
    const c = z[i];
    if (c === '"') { inQuotes = !inQuotes; out += c; continue; }
    if (inQuotes) { out += c; continue; }
    if (c === '\\' || c === '_' || c === '*') { out += c; if (i + 1 < z.length) { out += z[i + 1]; i++; } continue; }
    if (c === '[') {
      const j = z.indexOf(']', i);
      if (j > i) { out += z.slice(i, j + 1); i = j; continue; }
    }
    out += c === '.' ? '"."' : c;
  }
  return out;
}

// Dots in DATE formats break SSF in xlsx 0.18.5: "dd.mm.yyyy" parses the dot as
// a sub-second token, the internal error is swallowed, and the formatted text
// (.w) silently falls back to the raw serial ("45710"). Rewrite unquoted dots
// in date-type formats as literal "." before formatting; numeric decimal
// formats ("0.00") are untouched. Deleting .w forces sheet_to_json to
// re-format the cell from the sanitized .z.
function sanitizeDateFormats(sheet: XLSX.WorkSheet): void {
  for (const key of Object.keys(sheet)) {
    if (key[0] === '!') continue;
    const cell = sheet[key] as XLSX.CellObject & { z?: string; w?: string };
    if (cell && cell.t === 'n' && typeof cell.z === 'string' && cell.z.includes('.') && isDateFormat(cell.z)) {
      cell.z = quoteUnquotedDots(cell.z);
      delete cell.w;
    }
  }
}

// The keys sheet_to_json gives each column (its header text, "__EMPTY" for a
// blank header, "_1", "_2" on repeats), so regional columns are named exactly
// like the row keys. Mirrors xlsx 0.18.5 sheet_to_json with default options.
function headerKeys(sheet: XLSX.WorkSheet, range: XLSX.Range): Map<number, string> {
  const keys = new Map<number, string>();
  const seen: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })] as XLSX.CellObject | undefined;
    const base = cell == null ? '__EMPTY' : XLSX.utils.format_cell(cell);
    let key = base;
    let counter = seen[base] || 0;
    if (!counter) seen[base] = 1;
    else {
      do { key = `${base}_${counter++}`; } while (seen[key]);
      seen[base] = counter;
      seen[key] = 1;
    }
    keys.set(c, key);
  }
  return keys;
}

// A serial written with a date code. format_cell does not know the workbook's
// date system, so a 1904-based serial is moved to the 1900 system first, the
// same 1462 days SheetJS adds when it formats the cell itself.
function formatSerial(code: string, serial: number, date1904: boolean): string {
  return XLSX.utils.format_cell({ t: 'n', v: date1904 ? serial + 1462 : serial, z: code });
}

// Find the cells whose text follows regional settings and, when conventions
// are given, rewrite their text (.w) before sheet_to_json reads it. Without
// conventions every cell keeps exactly the text SheetJS gives (the US style).
// The header row is never rewritten, so the column names do not depend on the
// choice. Returns the column indexes of each kind, found in data rows only.
function applyRegionalStyle(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  conventions: FormatConventions | undefined,
  date1904: boolean,
): { dateCols: Set<number>; numberCols: Set<number> } {
  const dateCols = new Set<number>();
  const numberCols = new Set<number>();
  for (let r = range.s.r; r <= range.e.r; r++) {
    const isHeader = r === range.s.r;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as (XLSX.CellObject & { z?: string; w?: string }) | undefined;
      if (!cell || cell.t !== 'n' || typeof cell.v !== 'number') continue;
      if (typeof cell.w === 'string' && cell.w.startsWith(SHORT_DATE_MARK)) {
        if (!isHeader) dateCols.add(c);
        cell.w = formatSerial(!isHeader && conventions ? DATE_STYLE_CODES[conventions.date] : SHEETJS_SHORT_DATE, cell.v, date1904);
        continue;
      }
      if (isHeader) continue;
      if (cell.z === SHEETJS_SHORT_DATE_TIME) {
        dateCols.add(c);
        if (conventions) cell.w = formatSerial(DATE_STYLE_CODES[conventions.date] + DATE_TIME_SUFFIX, cell.v, date1904);
        continue;
      }
      // Every other date or time format is written exactly as its code says.
      if (typeof cell.z === 'string' && isDateFormat(cell.z)) continue;
      if (typeof cell.w === 'string' && hasNumberSeparators(cell.w)) {
        numberCols.add(c);
        if (conventions) cell.w = localizeNumberText(cell.w, conventions.number);
      }
    }
  }
  return { dateCols, numberCols };
}

/**
 * Read the first sheet as text, the way Excel shows it. `conventions` is the
 * date and number style of the user's Excel; without it, regional values keep
 * SheetJS's US style ("11/14/26", "1,234.50"), as before this option existed.
 */
export function parseExcel(arrayBuffer: ArrayBuffer, conventions?: FormatConventions): ParsedExcel {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: false, cellNF: true, dateNF: SHORT_DATE_PROBE });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  sanitizeDateFormats(sheet);
  const regional: RegionalColumns = { dates: [], numbers: [] };
  const ref = sheet['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    const date1904 = Boolean(wb.Workbook?.WBProps?.date1904);
    const { dateCols, numberCols } = applyRegionalStyle(sheet, range, conventions, date1904);
    if (dateCols.size > 0 || numberCols.size > 0) {
      const keys = headerKeys(sheet, range);
      const names = (cols: Set<number>) => [...cols].sort((a, b) => a - b).map((c) => keys.get(c) ?? '');
      regional.dates = names(dateCols);
      regional.numbers = names(numberCols);
    }
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });

  let columns: string[];
  if (rows.length > 0) {
    columns = Object.keys(rows[0]);
  } else {
    columns = [];
    const ref = sheet['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
        if (cell && cell.v != null) columns.push(String(cell.v));
      }
    }
  }

  return { columns, rows, regional };
}
