import { useEffect, useRef, useCallback } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { useStyles } from './UndoToast.styles';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  visible: boolean;
  canUndo?: boolean;
}

const DISMISS_MS = 3000;

export function UndoToast({ message, onUndo, onDismiss, visible, canUndo = true }: UndoToastProps) {
  const s = useStyles();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(onDismiss, DISMISS_MS);
  }, [onDismiss]);

  const clearTimer = () => { clearTimeout(timerRef.current); };

  useEffect(() => {
    if (visible) startTimer();
    return clearTimer;
  }, [visible, startTimer]);

  const handleUndo = () => { onUndo(); onDismiss(); };

  return (
    <div
      className={mergeClasses(s.root, visible ? s.visible : s.hidden)}
      onMouseEnter={clearTimer}
      onMouseLeave={() => { if (visible) startTimer(); }}
    >
      <span className={s.message}>{message}</span>
      <button type="button" className={mergeClasses(s.undo, !canUndo && s.undoDisabled)} disabled={!canUndo} onClick={handleUndo}>
        {t('placeholder.toast.undo')}
      </button>
    </div>
  );
}
