import { useShallow } from 'zustand/react/shallow';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { useDataStore } from '@/features/data/store/dataStore';
import { useEditorStore } from '../../store/editorStore';
import { RowNavigator } from '../RowNavigator';
import { PreviewDocument } from '../PreviewDocument';
import { FileNamesCard } from './FileNamesCard';
import { ImageRailSummary } from '@/features/data/components/ImageIntakePanel';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import { useStyles } from './PreviewPanel.styles';

interface PreviewPanelProps {
  onBackToPlaceholders: () => void;
  onUploadData: () => void;
  transitionBeat?: number;
}

export function PreviewPanel({ onBackToPlaceholders, onUploadData, transitionBeat = 0 }: PreviewPanelProps) {
  const s = useStyles();
  const { wordTokens, placeholders } = useEditorStore(
    useShallow((s) => ({ wordTokens: s.wordTokens, placeholders: s.placeholders })),
  );
  const { currentPreviewRow, rows, nextRow, prevRow, getFilledValue } = useDataStore(
    useShallow((s) => ({ currentPreviewRow: s.currentPreviewRow, rows: s.rows, nextRow: s.nextRow, prevRow: s.prevRow, getFilledValue: s.getFilledValue })),
  );
  const hasData = rows.length > 0;
  const isWaiting = transitionBeat >= 1 && transitionBeat < 3;

  return (
    <div className={mergeClasses(s.root, s.fadeIn, isWaiting && s.panelHidden)}>
      <div className={s.header}>
        <span className={s.title}>{t('preview.title')}</span>
        <span>
          {hasData && (
            <button type="button" className={s.backLink} style={{ marginRight: '12px' }} onClick={onUploadData}>
              {t('preview.replaceData')}
            </button>
          )}
          <button type="button" className={s.backLink} onClick={onBackToPlaceholders}>
            {t('preview.backToPlaceholders')}
          </button>
        </span>
      </div>
      {hasData ? (
        <>
          <div className={s.navigatorArea}>
            <RowNavigator
              current={currentPreviewRow + 1} total={rows.length}
              onPrev={prevRow} onNext={nextRow}
            />
          </div>
          <div className={s.rowIndicator}>
            {t('preview.rowIndicator', {
              current: String(currentPreviewRow + 1),
              total: String(rows.length),
            })}
          </div>
          <ImageRailSummary />
          <FileNamesCard />
          <div className={s.documentArea}>
            <PreviewDocument wordTokens={wordTokens} placeholders={placeholders}
              getFilledValue={getFilledValue} transitionBeat={transitionBeat} />
          </div>
        </>
      ) : (
        <div className={s.emptyState}>
          <p className={s.emptyText}>{t('preview.noData')}</p>
          <VeidneButton appearance="primary" size="small" onClick={onUploadData}>
            {t('placeholder.sidebar.uploadData')}
          </VeidneButton>
        </div>
      )}
    </div>
  );
}
