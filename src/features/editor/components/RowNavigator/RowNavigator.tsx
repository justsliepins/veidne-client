import { ChevronLeft16Regular, ChevronRight16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './RowNavigator.styles';

interface RowNavigatorProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function RowNavigator({ current, total, onPrev, onNext }: RowNavigatorProps) {
  const s = useStyles();
  return (
    <div className={s.root}>
      <button type="button" className={s.arrow} disabled={current === 1} onClick={onPrev}>
        <ChevronLeft16Regular />
      </button>
      <span className={s.counter}>
        {t('editor.row', { current: String(current), total: String(total) })}
      </span>
      <button type="button" className={s.arrow} disabled={current === total} onClick={onNext}>
        <ChevronRight16Regular />
      </button>
    </div>
  );
}
