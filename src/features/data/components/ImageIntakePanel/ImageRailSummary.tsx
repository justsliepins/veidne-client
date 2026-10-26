import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Dialog, DialogSurface } from '@fluentui/react-components';
import { ImageRegular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { features } from '@/config/features';
import { useDataStore } from '../../store/dataStore';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { matchImageField } from '../../utils/imageMatch';
import { coverageLine } from '../../utils/imageCoverage';
import { useNeedsPictures, expectedPictureCells } from '../../utils/needsPictures';
import { ImageIntakePanel } from './ImageIntakePanel';

/** Compact pictures summary for the Generate step's right rail: icon,
 *  coverage line, and an Add more images action that opens the full panel. */
export function ImageRailSummary() {
  const placeholders = useEditorStore((st) => st.placeholders);
  const { rows, columnMapping, imageFiles, imageResolutions } = useDataStore(
    useShallow((st) => ({
      rows: st.rows, columnMapping: st.columnMapping,
      imageFiles: st.imageFiles, imageResolutions: st.imageResolutions,
    })),
  );
  const [open, setOpen] = useState(false);
  const needsPictures = useNeedsPictures();

  const imageFields = placeholders.filter((p) => p.type === 'image');
  const matched = useMemo(() => {
    if (imageFields.length === 0) return 0;
    return Math.min(...imageFields.map((f) =>
      matchImageField(f.name, columnMapping, rows, imageFiles.keys(), imageResolutions).matchedCount));
  }, [imageFields, columnMapping, rows, imageFiles, imageResolutions]);

  if (!features.imagePlaceholders || imageFields.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 12px', marginBottom: '10px',
      border: '1px solid rgba(26,22,34,.1)', borderRadius: '10px',
      backgroundColor: '#FFFFFF',
    }} data-testid="image-rail-summary">
      <ImageRegular style={{ fontSize: '16px', color: '#4F46E5', flexShrink: 0 }} />
      <span style={{ flexGrow: 1, fontSize: '12.5px', color: '#1A1622' }}>
        {needsPictures
          ? (() => {
              // The empty-rail line names a concrete expected file so the user
              // knows what to look for (F17). distinctNames is non-empty whenever
              // count > 0, since both come from the same non-empty cells.
              const expected = expectedPictureCells(placeholders, columnMapping, rows);
              return t(expected.count === 1 ? 'pictures.rail.none.one' : 'pictures.rail.none.many',
                { count: String(expected.count), name: expected.distinctNames[0] ?? '' });
            })()
          : coverageLine(matched, rows.length)}
      </span>
      <VeidneButton appearance="secondary" size="small" onClick={() => setOpen(true)}>
        {t(needsPictures ? 'pictures.rail.addAction' : 'imageIntake.addMore')}
      </VeidneButton>
      <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) setOpen(false); }}>
        <DialogSurface style={{ maxWidth: '760px', padding: '16px' }}>
          <ImageIntakePanel />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <VeidneButton appearance="transparent" onClick={() => setOpen(false)}>
              {t('common.close')}
            </VeidneButton>
          </div>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
