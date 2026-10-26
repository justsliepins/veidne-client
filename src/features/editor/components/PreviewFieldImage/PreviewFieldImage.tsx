import { useMemo, useEffect, type CSSProperties } from 'react';
import { useDataStore } from '@/features/data/store/dataStore';
import { resolveImageForCell } from '@/features/data/utils/imageMatch';
import type { WordToken } from '../../utils/types';

/** Preview rendering for a tagged drawing: the current row's matched photo
 *  fitted inside the sample box (aspect preserved, never cropped); an empty
 *  box for no-picture rows, mirroring the transparent placeholder the
 *  generator embeds. Shared by the merged preview and the right-rail mini
 *  preview so both always agree. */
export function PreviewFieldImage({ token, fieldName }: { token: WordToken; fieldName: string }) {
  const blob = useDataStore((st) => {
    const col = Object.keys(st.columnMapping).find((k) => st.columnMapping[k] === fieldName);
    const cell = col ? st.rows[st.currentPreviewRow]?.[col] ?? '' : '';
    const manual = st.imageResolutions[`${fieldName} ${st.currentPreviewRow}`];
    const file = manual !== undefined
      ? (manual === '' ? null : manual)
      : resolveImageForCell(cell, st.imageFiles.keys());
    return file ? st.imageFiles.get(file) ?? null : null;
  });
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const w = token.imageEmuW ? Math.max(8, Math.round(token.imageEmuW / 9525)) : undefined;
  const h = token.imageEmuH ? Math.max(8, Math.round(token.imageEmuH / 9525)) : undefined;
  const box: CSSProperties = {
    width: w, height: h, maxWidth: '100%', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
    // Preview only: a hairline neutral outline so a light photo (or an empty
    // box) reads as a bounded picture on the white page, not blank space. It
    // never reaches the generated document. Outline keeps the box size exact.
    outline: '1px solid rgba(26, 22, 34, 0.14)',
    outlineOffset: '0px',
  };
  if (!url) {
    return <span data-testid="doc-image-empty" style={box} />;
  }
  return (
    <span style={box}>
      <img src={url} alt="" data-testid="doc-image"
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </span>
  );
}
