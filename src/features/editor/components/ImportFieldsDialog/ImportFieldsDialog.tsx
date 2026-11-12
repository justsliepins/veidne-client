import { useMemo, useState } from 'react';
import { Checkbox, Dialog, DialogSurface } from '@fluentui/react-components';
import { Warning20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { LOW_CONFIDENCE_FAMILIES } from '../../utils/placeholderDetector';
import type { ImportCandidate } from '../../utils/mergeImport';
import type { ImportOffer } from '../../store/editorStore';
import { describeControlTags } from '../../utils/controlTags';
import { useStyles } from './ImportFieldsDialog.styles';

interface ImportFieldsDialogProps {
  offer: ImportOffer;
  onConfirm: (keys: string[]) => void;
  onDismiss: () => void;
  onRemoveLoop: () => void;
}

function whereText(c: ImportCandidate): string {
  return c.parts.map((p) => t(`import.row.where.${p}`)).join(', ');
}

/**
 * The confirm step after uploading a template made for another mail merge
 * tool. It shows what was found before anything changes: each placeholder,
 * how many places it is in, which syntax it was written in and where, ticked
 * or not by how often that syntax is ordinary text. It also explains loops
 * and conditions Veidne cannot carry out, and offers to remove the tags of a
 * loop that wraps the whole document, the one case where that is lossless.
 */
export function ImportFieldsDialog({ offer, onConfirm, onDismiss, onRemoveLoop }: ImportFieldsDialogProps) {
  const s = useStyles();
  const { analysis, removedLoop } = offer;
  const { candidates, controls, wholeBodyLoop, autoNames } = analysis;
  // The parent remounts this component for every new analysis, so the
  // initial ticks are read once.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => c.preselected).map((c) => c.key)));

  const toggle = (key: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(key); else next.delete(key);
    return next;
  });
  const allOn = candidates.length > 0 && candidates.every((c) => selected.has(c.key));
  const fieldCount = useMemo(
    () => new Set(candidates.filter((c) => selected.has(c.key)).map((c) => c.name)).size,
    [candidates, selected]);
  const formatted = candidates.filter((c) => c.formats.length > 0).map((c) => c.name);
  const anyOutside = candidates.some((c) => c.parts.some((p) => p !== 'body'));

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) onDismiss(); }}>
      <DialogSurface className={s.surface} aria-labelledby="import-title" data-testid="import-dialog">
        <h2 id="import-title" className={s.title}>
          {controls.length > 0 ? t('import.title.controls') : t('import.title')}
        </h2>

        {removedLoop && (
          <p className={s.success} data-testid="import-loop-removed">
            {t('import.loop.removed', { open: removedLoop.open, close: removedLoop.close })}
          </p>
        )}

        {controls.length > 0 && (
          <section className={s.warn} data-testid="import-controls" aria-labelledby="import-controls-title">
            <div className={s.warnHead}>
              <Warning20Regular aria-hidden="true" className={s.warnIcon} />
              <h3 id="import-controls-title" className={s.warnTitle}>
                {t(wholeBodyLoop ? 'import.loop.title' : 'import.controls.title')}
              </h3>
            </div>
            <p className={s.warnText}>{t('import.controls.what', { tags: describeControlTags(controls) })}</p>
            <p className={s.warnText}>{t('import.controls.why')}</p>
            {wholeBodyLoop ? (
              <>
                <p className={s.warnText}>{t('import.loop.whole', { open: wholeBodyLoop.open, close: wholeBodyLoop.close })}</p>
                <p className={s.warnText}>{t('import.loop.offer')}</p>
                <div className={s.warnActions}>
                  <VeidneButton appearance="primary" onClick={onRemoveLoop}>{t('import.loop.remove')}</VeidneButton>
                </div>
              </>
            ) : (
              <p className={s.warnText}>
                {t('import.controls.fix')}{candidates.length > 0 ? ` ${t('import.controls.fieldsStill')}` : ''}
              </p>
            )}
          </section>
        )}

        {autoNames.length > 0 && (
          <p className={s.helper} data-testid="import-auto">
            {t(autoNames.length === 1 ? 'import.autoAdded.one' : 'import.autoAdded.many', { names: autoNames.join(', ') })}
          </p>
        )}

        {candidates.length > 0 && (
          <>
            <p className={s.helper}>{t('import.intro')}</p>
            <div role="group" aria-label={t('import.list.label')} className={s.list}>
              <div className={s.listHead}>
                <span className={s.listLabel}>{t('import.list.label')}</span>
                <button type="button" className={s.linkBtn}
                  onClick={() => setSelected(allOn ? new Set() : new Set(candidates.map((c) => c.key)))}>
                  {allOn ? t('import.clearAll') : t('import.selectAll')}
                </button>
              </div>
              {candidates.map((c) => (
                <div key={c.key} className={s.row} data-testid="import-row" data-family={c.family}>
                  <Checkbox
                    checked={selected.has(c.key)}
                    onChange={(_, data) => toggle(c.key, data.checked === true)}
                    label={(
                      <span className={s.rowLabel}>
                        <span className={s.rowName} data-testid="import-row-name">{c.name}</span>
                        <span className={s.chip} data-testid="import-row-shape">{c.shapes.length > 0 ? c.shapes.join(', ') : t(`import.family.${c.family}`)}</span>
                        <span className={s.rowMeta}>{tCount(c.occurrences, 'import.row.places')}, {whereText(c)}</span>
                      </span>
                    )}
                  />
                  {LOW_CONFIDENCE_FAMILIES.has(c.family) && (
                    <p className={s.rowHint}>{t('import.row.lowConfidence')}</p>
                  )}
                </div>
              ))}
            </div>
            {formatted.length > 0 && (
              <p className={s.note} data-testid="import-formats">{t('import.formats', { names: formatted.join(', ') })}</p>
            )}
            {anyOutside && <p className={s.note}>{t('import.outsideBody')}</p>}
          </>
        )}

        {/* Confirming rewrites the template and starts the undo history
            again, so the one way back is the original file. */}
        {(candidates.length > 0 || wholeBodyLoop) && (
          <p className={s.note} data-testid="import-way-back">{t('import.wayBack')}</p>
        )}

        <div className={s.buttonRow}>
          {candidates.length > 0 ? (
            <>
              <VeidneButton appearance="transparent" onClick={onDismiss}>{t('import.skip')}</VeidneButton>
              <VeidneButton appearance="primary" disabled={fieldCount === 0}
                onClick={() => onConfirm(candidates.filter((c) => selected.has(c.key)).map((c) => c.key))}>
                {tCount(fieldCount, 'import.confirm')}
              </VeidneButton>
            </>
          ) : (
            // With a whole-body loop, removing its two tags is the recommended
            // action; going on without it leaves Generate refused.
            <VeidneButton appearance={wholeBodyLoop ? 'secondary' : 'primary'} onClick={onDismiss}>{t('import.continue')}</VeidneButton>
          )}
        </div>
      </DialogSurface>
    </Dialog>
  );
}
