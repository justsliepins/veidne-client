import { features } from '@/config/features';
import { useDataStore } from '../store/dataStore';
import { useEditorStore } from '@/features/editor/store/editorStore';
import type { Placeholder } from '@/features/editor/utils/types';

// The single derived guidance gate (research basis: branching behind a
// perceived linear flow). True exactly when the run will want pictures and
// has none yet: at least one image field, at least one data row, zero image
// files loaded. Every pictures-guidance surface keys off this and nothing
// else grows flag or field checks.
export function computeNeedsPictures(
  placeholders: Placeholder[],
  rowCount: number,
  imageFileCount: number,
): boolean {
  return features.imagePlaceholders
    && placeholders.some((p) => p.type === 'image')
    && rowCount > 0
    && imageFileCount === 0;
}

export function needsPicturesNow(): boolean {
  return computeNeedsPictures(
    useEditorStore.getState().placeholders,
    useDataStore.getState().rows.length,
    useDataStore.getState().imageFiles.size,
  );
}

export function useNeedsPictures(): boolean {
  const hasImageField = useEditorStore((s) => s.placeholders.some((p) => p.type === 'image'));
  const rowCount = useDataStore((s) => s.rows.length);
  const fileCount = useDataStore((s) => s.imageFiles.size);
  return features.imagePlaceholders && hasImageField && rowCount > 0 && fileCount === 0;
}

/** Rows that actually expect a picture: a non-empty cell in any mapped image
 *  column. Drives the N in the guidance copy. */
export function expectedPictureCells(
  placeholders: Placeholder[],
  columnMapping: Record<string, string>,
  rows: Record<string, string>[],
): { count: number; distinctNames: string[]; singleColumn: string | null } {
  const imageFields = placeholders.filter((p) => p.type === 'image');
  const columns = imageFields
    .map((f) => Object.keys(columnMapping).find((c) => columnMapping[c] === f.name))
    .filter((c): c is string => !!c);
  let count = 0;
  const distinct: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const col of columns) {
      const cell = (row[col] ?? '').trim();
      if (!cell) continue;
      count++;
      const key = cell.toLowerCase();
      if (!seen.has(key)) { seen.add(key); distinct.push(cell); }
    }
  }
  return {
    count,
    distinctNames: distinct,
    singleColumn: imageFields.length === 1 ? (columns[0] ?? imageFields[0].name) : null,
  };
}
