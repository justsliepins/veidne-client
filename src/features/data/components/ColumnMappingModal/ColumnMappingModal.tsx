import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogSurface, mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import type { FuzzyMatchResult } from '../../utils/fuzzyMatch';
import type { RegionalColumns } from '../../utils/excelParser';
import type { FormatConventions } from '../../utils/localeFormats';
import { RegionalFormatChoice } from '../RegionalFormatChoice';
import { storedFormatConventionsRaw, restoreStoredFormatConventionsRaw } from '../../utils/formatPreference';
import { MappingRow } from './MappingRow';
import { useStyles } from './ColumnMappingModal.styles';

interface ColumnMappingModalProps {
  open: boolean; matchResult: FuzzyMatchResult;
  rows: Record<string, string>[]; placeholderNames: string[];
  onApply: (mapping: Record<string, string>) => void; onCancel: () => void;
  onReupload: (file: File) => void;
  /** Zero fields in the document: back to the Fields step, keeping the data. */
  onAddFields: () => void;
  /** Columns whose dates or numbers follow the computer's regional settings,
   *  the current style, and how to change it (applied at once to `rows`). */
  regional?: RegionalColumns;
  formats?: FormatConventions;
  onFormatsChange?: (next: Partial<FormatConventions>) => void;
  /** The matching in use (empty before the first "Looks good"). A reopened
   *  dialog starts from it, so Cancel always returns to what the preview shows. */
  appliedMapping?: Record<string, string>;
}

function startingMapping(applied: Record<string, string> | undefined, matchResult: FuzzyMatchResult) {
  if (applied && Object.keys(applied).length > 0) return { ...applied };
  const init: Record<string, string> = {};
  for (const m of matchResult.matched) init[m.column] = m.placeholder;
  return init;
}

export function ColumnMappingModal({ open, matchResult, rows, placeholderNames, onApply, onCancel, onReupload, onAddFields, regional, formats, onFormatsChange, appliedMapping }: ColumnMappingModalProps) {
  const s = useStyles();
  // Nothing to match to. Instead of a table of disabled controls under a
  // sentence claiming the columns were matched, say so and send the user to
  // add a field; the spreadsheet stays loaded for when they come back.
  const noFields = placeholderNames.length === 0;
  const [mapping, setMapping] = useState<Record<string, string>>(() => startingMapping(appliedMapping, matchResult));
  // The dialog stays mounted between openings. Each opening starts from the
  // matching in use and remembers the date and number style (and what was
  // stored), so that Cancel undoes every change made since the dialog opened,
  // the style included (review b, finding 10). Adjusted during render, as React
  // recommends for state that follows a prop.
  const [opening, setOpening] = useState(() => ({ open, formats, stored: open ? storedFormatConventionsRaw() : null }));
  if (open !== opening.open) {
    setOpening({ open, formats, stored: open ? storedFormatConventionsRaw() : null });
    if (open) setMapping(startingMapping(appliedMapping, matchResult));
  }
  const handleCancel = () => {
    const before = opening.formats;
    if (before && formats && onFormatsChange && (before.date !== formats.date || before.number !== formats.number)) {
      onFormatsChange(before);
      restoreStoredFormatConventionsRaw(opening.stored);
    }
    onCancel();
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasData = rows.length > 0;

  const matchedCols = matchResult.matched.map(m => m.column);
  const unmatchedCols = matchResult.unmatchedColumns;
  const usedPlaceholders = useMemo(() => new Set(Object.values(mapping)), [mapping]);
  // Document fields that no column fills right now. They come out empty in
  // every document, so the modal says so by name instead of only listing the
  // columns it will skip (audit nov 2026, finding 1).
  const emptyFields = placeholderNames.filter(ph => !usedPlaceholders.has(ph));
  const confidenceByColumn = useMemo(() => {
    const m: Record<string, string> = {};
    for (const x of matchResult.matched) m[x.column] = x.confidence;
    return m;
  }, [matchResult]);

  const getAvailable = (currentCol: string) => {
    const current = mapping[currentCol];
    return placeholderNames.filter(ph => ph === current || !usedPlaceholders.has(ph));
  };

  const handleChange = (col: string, ph: string) => setMapping(prev => { const n = { ...prev }; if (ph) n[col] = ph; else delete n[col]; return n; });

  const handleApply = () => {
    const final: Record<string, string> = {};
    for (const [col, ph] of Object.entries(mapping)) { if (ph) final[col] = ph; }
    onApply(final);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onReupload(file);
    e.target.value = '';
  };

  const preview = rows[0] ?? {};
  const renderRows = (cols: string[], matched: boolean) => cols.map(col => (
    <MappingRow key={col} column={col} selectedPlaceholder={mapping[col] ?? ''}
      availablePlaceholders={getAvailable(col)} previewValue={preview[col] ?? ''}
      isMatched={matched} readOnly={!hasData}
      guessed={matched && confidenceByColumn[col] === 'substring' && mapping[col] === matchResult.matched.find(m => m.column === col)?.placeholder}
      onChange={(ph) => handleChange(col, ph)} />
  ));

  return (
    <Dialog open={open}>
      <DialogSurface className={s.surface}>
        <div className={s.modalHeader}>
          <div className={s.title}>{t('data.mapping.title')}</div>
          {!noFields && hasData && emptyFields.length > 0 ? (
            <div className={s.noticeBanner} role="status">
              <div className={s.noticeBold}>
                {tCount(emptyFields.length, 'data.mapping.empty.title')}{' '}{emptyFields.join(', ')}
              </div>
              <div className={s.noticeText}>
                {t('data.mapping.empty.text', { rows: tCount(rows.length, 'count.documents') })}
              </div>
            </div>
          ) : !noFields && <div className={s.subtitle}>{t('data.mapping.subtitle')}</div>}
          {noFields && (
            <div className={s.noticeBanner}>
              <div className={s.noticeBold}>{t('data.mapping.noFields.title')}</div>
              <div className={s.noticeText}>{t('data.mapping.noFields.text')}</div>
            </div>
          )}
          {!noFields && !hasData && (
            <div className={s.noticeBanner}>
              <div className={s.noticeBold}>{t('mapping.columnsMatchPerfectly')}</div>
              <div className={s.noticeText}>{t('mapping.noDataRows')}</div>
            </div>
          )}
        </div>
        {!noFields && <div className={s.table}>
          {/* Dates and numbers in the computer's own style (audit nov 2026,
              finding 2): the guess is visible and one click changes it; the
              Preview column shows the result at once. It opens the scrolling
              area rather than the fixed header, so on a phone the table keeps
              its room; the table header still sticks once it scrolls by. */}
          {hasData && regional && formats && onFormatsChange && (
            <RegionalFormatChoice className={s.formats} regional={regional} value={formats} onChange={onFormatsChange} />
          )}
          <div className={s.tableHeader}>
            <span className={s.headerCol}>{t('data.mapping.column')}</span>
            <span className={s.headerPlaceholder}>{t('data.mapping.placeholder')}</span>
            {hasData && <span className={s.headerPreview}>{t('data.mapping.preview')}</span>}
          </div>
          {matchedCols.length > 0 && (<>
            <div className={mergeClasses(s.sectionHeader, s.sectionMatched)}>
              {t('data.mapping.matched')} ({matchedCols.length})
            </div>
            {renderRows(matchedCols, true)}
          </>)}
          {unmatchedCols.length > 0 && (<>
            <div className={mergeClasses(s.sectionHeader, s.sectionUnmatched)}>
              {t('data.mapping.unmatched')} ({unmatchedCols.length})
            </div>
            {renderRows(unmatchedCols, false)}
          </>)}
        </div>}
        <div className={s.footer}>
          {noFields ? (
            <>
              <VeidneButton appearance="secondary" size="small" onClick={handleCancel}>{t('data.mapping.cancel')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={onAddFields}>{t('data.mapping.addFields')}</VeidneButton>
            </>
          ) : hasData ? (
            <>
              <VeidneButton appearance="secondary" size="small" onClick={handleCancel}>{t('data.mapping.cancel')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={handleApply}>
                {emptyFields.length > 0 ? tCount(emptyFields.length, 'data.mapping.applyWithEmpty') : t('data.mapping.apply')}
              </VeidneButton>
            </>
          ) : (
            <>
              <VeidneButton appearance="secondary" size="small" onClick={handleCancel}>{t('common.close')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={() => fileInputRef.current?.click()}>{t('mapping.uploadNewFile')}</VeidneButton>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
            </>
          )}
        </div>
      </DialogSurface>
    </Dialog>
  );
}
