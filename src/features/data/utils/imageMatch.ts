// Matching spreadsheet cells to dropped image files, per image field column.
// Same forgiving philosophy as fuzzyMatch: case-insensitive, trimmed, and the
// extension is optional on either side ("anna" matches "Anna.JPG").

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const REJECTED_EXTENSIONS = ['heic', 'heif'];

export function isImageFileName(name: string): boolean {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function isRejectedFileName(name: string): boolean {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return REJECTED_EXTENSIONS.includes(ext);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function stripExt(s: string): string {
  return s.replace(/\.[a-z0-9]+$/i, '');
}

/** The dropped file a cell refers to, or null. Exact (normalized) file name
 *  first, then the extensionless stem. */
export function resolveImageForCell(cell: string, fileNames: Iterable<string>): string | null {
  const key = normalize(cell);
  if (!key) return null;
  for (const name of fileNames) {
    if (normalize(name) === key) return name;
  }
  const stemKey = stripExt(key);
  for (const name of fileNames) {
    if (stripExt(normalize(name)) === stemKey) return name;
  }
  return null;
}

export interface ImageRowMatch {
  rowIndex: number;
  cell: string;
  /** Auto-matched file name, manual override, or null (no picture). */
  file: string | null;
  /** True when the user explicitly chose to generate without a picture. */
  skipped: boolean;
}

export interface ImageFieldMatchResult {
  field: string;
  column: string | null;
  rows: ImageRowMatch[];
  matchedCount: number;
  unmatchedRows: ImageRowMatch[];
}

/** Per-row file resolution for one image field. Manual resolutions override
 *  the automatic name match; the empty-string resolution means "generate this
 *  row without a picture". */
export function matchImageField(
  field: string,
  columnMapping: Record<string, string>,
  rows: Record<string, string>[],
  fileNames: Iterable<string>,
  resolutions: Record<string, string>,
): ImageFieldMatchResult {
  const column = Object.keys(columnMapping).find((c) => columnMapping[c] === field) ?? null;
  const names = [...fileNames];

  const rowMatches: ImageRowMatch[] = rows.map((row, rowIndex) => {
    const cell = column ? (row[column] ?? '') : '';
    const manual = resolutions[`${field} ${rowIndex}`];
    if (manual !== undefined) {
      return { rowIndex, cell, file: manual === '' ? null : manual, skipped: manual === '' };
    }
    return { rowIndex, cell, file: resolveImageForCell(cell, names), skipped: false };
  });

  const matched = rowMatches.filter((r) => r.file !== null);
  return {
    field, column, rows: rowMatches,
    matchedCount: matched.length,
    unmatchedRows: rowMatches.filter((r) => r.file === null && !r.skipped),
  };
}

/** Files no row references across all image fields (they will be ignored). */
export function unreferencedFiles(
  fileNames: Iterable<string>,
  results: ImageFieldMatchResult[],
): string[] {
  const used = new Set<string>();
  for (const r of results) for (const row of r.rows) if (row.file) used.add(row.file);
  return [...fileNames].filter((n) => !used.has(n));
}
