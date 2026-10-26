import * as XLSX from 'xlsx';

export interface ParsedExcel {
  columns: string[];
  rows: Record<string, string>[];
}

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

export function parseExcel(arrayBuffer: ArrayBuffer): ParsedExcel {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: false, cellNF: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  sanitizeDateFormats(sheet);
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

  return { columns, rows };
}
