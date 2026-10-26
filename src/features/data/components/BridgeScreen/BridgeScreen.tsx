import { useRef } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { getPlaceholderColor } from '@/features/editor/utils/placeholderColors';
import { useStyles } from './BridgeScreen.styles';

interface BridgeScreenProps {
  placeholders: Array<{ name: string; colorIndex: number }>;
  onUpload: (file: File) => void;
  onCreateKit: () => void;
  onBack: () => void;
  pulseRight?: boolean;
}

export function BridgeScreen({ placeholders, onUpload, onCreateKit, onBack, pulseRight }: BridgeScreenProps) {
  const s = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className={s.root}>
      <div className={s.content}>
        <div className={s.header}>
          <div className={s.title}>
            {placeholders.length === 1
              ? t('bridge.headerSingular')
              : t('bridge.header', { count: String(placeholders.length) })}
            {placeholders.map((ph) => {
              const c = getPlaceholderColor(ph.colorIndex);
              return <span key={ph.name} className={s.chip} style={{ backgroundColor: c.bg, color: c.chipText }}>{ph.name}</span>;
            })}
          </div>
          <div className={s.subtitle}>{t('bridge.subtitle')}</div>
        </div>
        <div className={s.cards}>
          <button type="button" className={s.card} onClick={() => inputRef.current?.click()}>
            <span className={s.cardTitle}>{t('bridge.haveSpreadsheet')}</span>
            <span className={s.cardSub}>{t('bridge.haveSpreadsheet.sub')}</span>
          </button>
          <button type="button" className={mergeClasses(s.card, pulseRight && s.cardPulse)} onClick={onCreateKit}>
            <span className={s.cardTitle}>{t('bridge.createForMe')}</span>
            <span className={s.badge}>{t('bridge.mostCommon')}</span>
            <span className={s.cardSub}>{t('bridge.createForMe.sub')}</span>
          </button>
        </div>
        <button type="button" className={s.backLink} onClick={onBack}>{t('bridge.backToFields')}</button>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
    </div>
  );
}
