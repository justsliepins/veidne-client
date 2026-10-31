import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { useStyles } from './DataLoadedInfoBar.styles';

interface DataLoadedInfoBarProps {
  beat: number;
  rowCount: number;
  fieldCount: number;
  onDismiss: () => void;
  /** Fields no column fills. While any exist the bar stays up as a warning,
   *  names them, and offers the way back to the column choice. */
  emptyFields?: string[];
  onChooseColumns?: () => void;
}

export function DataLoadedInfoBar({ beat, rowCount, fieldCount, onDismiss, emptyFields = [], onChooseColumns }: DataLoadedInfoBarProps) {
  const s = useStyles();

  // Warning variant: not dismissable, shown once the load transition is over.
  if (emptyFields.length > 0 && rowCount > 0 && (beat === 0 || beat >= 4)) {
    return (
      <div className={mergeClasses(s.root, s.visible, s.warn)} role="status">
        <span className={s.text}>
          {tCount(emptyFields.length, 'data.empty.bar')}{' '}{emptyFields.join(', ')}
          {' · '}{tCount(rowCount, 'data.empty.barRows')}
        </span>
        {onChooseColumns && (
          <button type="button" className={s.gotIt} onClick={onChooseColumns}>{t('data.empty.choose')}</button>
        )}
      </div>
    );
  }

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
