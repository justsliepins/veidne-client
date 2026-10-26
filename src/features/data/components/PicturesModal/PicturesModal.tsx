import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Dialog, DialogSurface, mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { useDataStore } from '../../store/dataStore';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { expectedPictureCells } from '../../utils/needsPictures';
import { ImageIntakePanel } from '../ImageIntakePanel';
import { useStyles } from './PicturesModal.styles';

/** The guided Pictures step: a Data sub-state in the mapping modal's visual
 *  grammar, shown once when a run that wants pictures has none yet. Pictures
 *  are part of the data, so this sits between mapping and the preview. */
export function PicturesModal() {
  const s = useStyles();
  const placeholders = useEditorStore((st) => st.placeholders);
  const { open, rows, columnMapping, imageFiles, continuePictures } = useDataStore(
    useShallow((st) => ({
      open: st.dataSubState === 'pictures',
      rows: st.rows, columnMapping: st.columnMapping,
      imageFiles: st.imageFiles, continuePictures: st.continuePictures,
    })),
  );

  const expected = useMemo(
    () => expectedPictureCells(placeholders, columnMapping, rows),
    [placeholders, columnMapping, rows],
  );

  if (!open) return null;

  const body = expected.singleColumn !== null
    ? t(expected.count === 1 ? 'pictures.body.single.one' : 'pictures.body.single.many',
        { column: expected.singleColumn, count: String(expected.count) })
    : tCount(expected.count, 'pictures.body.multi');

  const chips = expected.distinctNames.slice(0, 5);
  const more = expected.distinctNames.length - chips.length;

  return (
    <Dialog open>
      <DialogSurface className={s.surface}>
        <h2 className={s.title}>{t('pictures.title')}</h2>
        <p className={s.body}>{body}</p>
        <div className={s.chips} data-testid="pictures-chips">
          {chips.map((name) => <span key={name} className={s.chip}>{name}</span>)}
          {more > 0 && <span className={s.chipMore}>{t('pictures.more', { count: String(more) })}</span>}
        </div>
        <ImageIntakePanel chooseAppearance="primary" />
        <div className={mergeClasses(s.buttonRow, imageFiles.size === 0 && s.buttonRowStart)}>
          {imageFiles.size > 0 ? (
            // Pictures are in: moving on is the obvious next action.
            <VeidneButton appearance="primary" onClick={continuePictures}>
              {t('pictures.continue')}
            </VeidneButton>
          ) : (
            // No pictures yet: skipping is the quiet escape hatch, a text link in
            // the bottom-left, always available but never competing with Choose
            // images for attention.
            <button type="button" className={s.skipLink} onClick={continuePictures}>
              {t('pictures.continueWithout')}
            </button>
          )}
        </div>
      </DialogSurface>
    </Dialog>
  );
}
