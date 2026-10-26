import { useRef } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useStyles } from './MatchDataScreen.styles';

interface MatchDataScreenProps {
  columns: string[];
  rowCount: number;
  onUploadTemplate: (file: File) => void;
  onBack: () => void;
}

const MAX_VISIBLE_CHIPS = 10;

export function MatchDataScreen({ columns, rowCount, onUploadTemplate, onBack }: MatchDataScreenProps) {
  const s = useStyles();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadTemplate(file);
    e.target.value = '';
  };

  return (
    <div className={s.root}>
      <div className={s.content}>
        <div className={s.header}>
          <div className={s.title}>{tCount(columns.length, 'matchData.title')}</div>
          <div className={s.chipsWrap}>
            {columns.slice(0, MAX_VISIBLE_CHIPS).map(col => (
              <span key={col} className={s.chip}>{col}</span>
            ))}
            {columns.length > MAX_VISIBLE_CHIPS && (
              <span className={s.moreChip}>+{columns.length - MAX_VISIBLE_CHIPS}</span>
            )}
          </div>
          <div className={s.rowCount}>{tCount(rowCount, 'matchData.rows')}</div>
        </div>
        <div className={s.cards}>
          <div className={mergeClasses(s.card, s.cardPrimary)} role="button" tabIndex={0}
            onClick={() => useTemplateStore.getState().openLibrary()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') useTemplateStore.getState().openLibrary(); }}>
            <div className={s.cardTitle}>{t('matchData.library.title')}</div>
            <div className={s.cardSub}>{t('matchData.library.description')}</div>
          </div>
          <div className={s.card} role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}>
            <div className={s.cardTitle}>{t('matchData.upload.title')}</div>
            <div className={s.cardSub}>{t('matchData.upload.description')}</div>
            <input ref={fileRef} type="file" accept=".docx" className={s.hiddenInput} onChange={handleFileChange} />
          </div>
        </div>
        <button type="button" className={s.backLink} onClick={onBack}>{t('matchData.back')}</button>
      </div>
    </div>
  );
}
