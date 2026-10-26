import type { Placeholder } from '@/features/editor/utils/types';

/**
 * How generated documents are named. Held in the data store and read by both
 * the live preview (PreviewPanel) and the generation loop (generatorStore), so
 * the two always agree because they call the same pure functions below.
 */
export interface NamingConfig {
  /** Placeholder name whose value becomes the filename stem. */
  field: string;
  /** Optional literal text prepended to the stem (Advanced). */
  prefix?: string;
  /** Optional second field appended to disambiguate collisions. */
  secondField?: string | null;
  /** How duplicate stems are resolved. */
  dupeMode: 'number' | 'field';
}

const DOCX = '.docx';
const MAX_STEM = 200;
// Windows reserved device names (case-insensitive), matched against the whole stem.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
// Illegal/risky filename characters. Mirrors the original rule (including smart
// quotes) and adds C0/C1 control characters. Unicode letters such as the Latvian
// set are intentionally left intact (no ASCII folding).
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const ILLEGAL_PUNCT = /[/\\?*:|"<>‘’“”'`#%&{}$!@~^;]/g;

/** Placeholder names that are actually mapped to a column, in placeholder order. */
export function mappedFields(
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
): string[] {
  const mapped = new Set(Object.values(columnMapping));
  // Image fields hold picture file names, not text, so they are never
  // offered as a naming column.
  return placeholders
    .filter((p) => p.type !== 'image')
    .map((p) => p.name)
    .filter((name) => mapped.has(name));
}

/** A field's value for a row: find its column in the mapping, read row[col]. */
export function fieldValue(
  field: string,
  row: Record<string, string>,
  columnMapping: Record<string, string>,
): string {
  if (!field) return '';
  const col = Object.keys(columnMapping).find((k) => columnMapping[k] === field);
  return col ? row[col] ?? '' : '';
}

/** Sanitize one segment: strip illegal/control chars, collapse whitespace to "_". */
function sanitizeSegment(raw: string): string {
  return raw.replace(CONTROL, '').replace(ILLEGAL_PUNCT, '').trim().replace(/\s+/g, '_');
}

/** Final pass on the assembled stem: trailing dots/spaces, reserved names, length. */
function finalizeStem(stem: string): string {
  let s = stem.replace(/[ .]+$/g, '');
  if (RESERVED.test(s)) s = `${s}_file`;
  if (s.length > MAX_STEM) s = s.slice(0, MAX_STEM).replace(/[ .]+$/g, '');
  return s;
}

/**
 * The filename stem for a row (no extension, no de-duplication). Pure: the same
 * inputs always yield the same stem, which is what keeps preview and output in
 * lockstep. A blank chosen-field value falls back to the row number (Row_3).
 */
export function buildStem(
  config: NamingConfig,
  row: Record<string, string>,
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
  rowNumber: number,
): string {
  const field = config.field || mappedFields(columnMapping, placeholders)[0] || '';
  const parts: string[] = [];

  const prefix = sanitizeSegment(config.prefix ?? '');
  if (prefix) parts.push(prefix);

  const value = sanitizeSegment(fieldValue(field, row, columnMapping));
  parts.push(value || `Row_${rowNumber}`);

  if (config.dupeMode === 'field' && config.secondField) {
    const second = sanitizeSegment(fieldValue(config.secondField, row, columnMapping));
    if (second) parts.push(second);
  }

  return finalizeStem(parts.join('_')) || `Row_${rowNumber}`;
}

/**
 * The final, unique filename for a row. De-duplication via the shared usedNames
 * set guarantees no two files share a name (_2, _3, ...). The row number is
 * derived from usedNames.size, so callers never need to thread an index: both
 * the preview and the generation loop build usedNames over the same rows in the
 * same order, so the i-th call sees size === i either way.
 */
export function buildFileName(
  config: NamingConfig,
  row: Record<string, string>,
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
  usedNames: Set<string>,
): string {
  const rowNumber = usedNames.size + 1;
  const stem = buildStem(config, row, columnMapping, placeholders, rowNumber);
  let name = `${stem}${DOCX}`;
  if (usedNames.has(name)) {
    let i = 2;
    while (usedNames.has(`${stem}_${i}${DOCX}`)) i++;
    name = `${stem}_${i}${DOCX}`;
  }
  usedNames.add(name);
  return name;
}

/** First `limit` resulting filenames plus the total, for the live preview list. */
export function previewFileNames(
  config: NamingConfig,
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
  limit: number,
): { names: string[]; total: number } {
  const usedNames = new Set<string>();
  const names: string[] = [];
  for (let i = 0; i < rows.length && names.length < limit; i++) {
    names.push(buildFileName(config, rows[i], columnMapping, placeholders, usedNames));
  }
  return { names, total: rows.length };
}

export interface CollisionInfo {
  hasDuplicates: boolean;
  /** Stem (no extension) of the largest colliding group. */
  worstStem: string;
  /** Number of rows that share that stem. */
  worstCount: number;
  /** Total rows involved in any collision. */
  duplicateRows: number;
}

/**
 * Collision picture for a config, computed across ALL rows from the pre-dedupe
 * stems. With dupeMode 'field' and a second field set, the stems already
 * include it, so this reports any residual collisions (identical rows).
 */
export function collisionInfo(
  config: NamingConfig,
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
): CollisionInfo {
  const counts = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const stem = buildStem(config, rows[i], columnMapping, placeholders, i + 1);
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  let worstStem = '';
  let worstCount = 0;
  let duplicateRows = 0;
  for (const [stem, count] of counts) {
    if (count > 1) {
      duplicateRows += count;
      if (count > worstCount) {
        worstCount = count;
        worstStem = stem;
      }
    }
  }
  return { hasDuplicates: worstCount > 1, worstStem, worstCount, duplicateRows };
}

/**
 * Suggest a second field to disambiguate: the first mapped field other than the
 * chosen one whose addition makes every name unique. If none fully resolves the
 * collisions (identical rows), returns the first available other field as a best
 * effort (the _2/_3 fallback then covers the remainder); null if none exist.
 */
export function suggestSecondField(
  config: NamingConfig,
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  placeholders: Placeholder[],
): string | null {
  const candidates = mappedFields(columnMapping, placeholders).filter((f) => f !== config.field);
  for (const candidate of candidates) {
    const info = collisionInfo(
      { ...config, dupeMode: 'field', secondField: candidate },
      rows,
      columnMapping,
      placeholders,
    );
    if (!info.hasDuplicates) return candidate;
  }
  return candidates[0] ?? null;
}
