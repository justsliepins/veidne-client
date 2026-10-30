import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogSurface, mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import type { FuzzyMatchResult } from '../../utils/fuzzyMatch';
import { MappingRow } from './MappingRow';
import { useStyles } from './ColumnMappingModal.styles';

interface ColumnMappingModalProps {
  open: boolean; matchResult: FuzzyMatchResult;
  rows: Record<string, string>[]; placeholderNames: string[];
  onApply: (mapping: Record<string, string>) => void; onCancel: () => void;
  onReupload: (file: File) => void;
  /** Zero fields in the document: back to the Fields step, keeping the data. */
  onAddFields: () => void;
}

export function ColumnMappingModal({ open, matchResult, rows, placeholderNames, onApply, onCancel, onReupload, onAddFields }: ColumnMappingModalProps) {
  const s = useStyles();
  // Nothing to match to. Instead of a table of disabled controls under a
  // sentence claiming the columns were matched, say so and send the user to
  // add a field; the spreadsheet stays loaded for when they come back.
  const noFields = placeholderNames.length === 0;
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of matchResult.matched) init[m.column] = m.placeholder;
    return init;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasData = rows.length > 0;

  const matchedCols = matchResult.matched.map(m => m.column);
  const unmatchedCols = matchResult.unmatchedColumns;
  const usedPlaceholders = useMemo(() => new Set(Object.values(mapping)), [mapping]);

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
      onChange={(ph) => handleChange(col, ph)} />
  ));

  return (
    <Dialog open={open}>
      <DialogSurface className={s.surface}>
        <div className={s.modalHeader}>
          <div className={s.title}>{t('data.mapping.title')}</div>
          {!noFields && <div className={s.subtitle}>{t('data.mapping.subtitle')}</div>}
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
              <VeidneButton appearance="secondary" size="small" onClick={onCancel}>{t('data.mapping.cancel')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={onAddFields}>{t('data.mapping.addFields')}</VeidneButton>
            </>
          ) : hasData ? (
            <>
              <VeidneButton appearance="secondary" size="small" onClick={onCancel}>{t('data.mapping.cancel')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={handleApply}>{t('data.mapping.apply')}</VeidneButton>
            </>
          ) : (
            <>
              <VeidneButton appearance="secondary" size="small" onClick={onCancel}>{t('common.close')}</VeidneButton>
              <VeidneButton appearance="primary" size="small" onClick={() => fileInputRef.current?.click()}>{t('mapping.uploadNewFile')}</VeidneButton>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
            </>
          )}
        </div>
      </DialogSurface>
    </Dialog>
  );
}
