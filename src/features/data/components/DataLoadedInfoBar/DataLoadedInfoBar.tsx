import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { useStyles } from './DataLoadedInfoBar.styles';

interface DataLoadedInfoBarProps {
  beat: number;
  rowCount: number;
  fieldCount: number;
  onDismiss: () => void;
}

export function DataLoadedInfoBar({ beat, rowCount, fieldCount, onDismiss }: DataLoadedInfoBarProps) {
  const s = useStyles();

  if (beat === 0) return null;

  const showInfo = beat >= 4;
  const text = showInfo
    ? t('data.transition.info', {
        rows: tCount(rowCount, 'count.rows'),
        fields: tCount(fieldCount, 'count.fieldsEach'),
        total: String(rowCount),
      })
    : t('data.transition.loaded', { rows: tCount(rowCount, 'count.rows') });

  return (
    <div className={mergeClasses(s.root, beat >= 1 ? s.visible : s.hidden)}>
      <span className={s.text}>{text}</span>
      {showInfo && (
        <button type="button" className={s.gotIt} onClick={onDismiss}>
          {t('data.transition.gotIt')}
        </button>
      )}
    </div>
  );
}
