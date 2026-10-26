import { useEffect, useRef, useCallback } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { ErrorCircle16Regular } from '@fluentui/react-icons';
import { useStyles } from './ErrorToast.styles';

interface ErrorToastProps { message: string; visible: boolean; onDismiss: () => void }
const DISMISS_MS = 5000;

export function ErrorToast({ message, visible, onDismiss }: ErrorToastProps) {
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
  return (
    <div className={mergeClasses(s.root, visible ? s.visible : s.hidden)}
      onMouseEnter={clearTimer} onMouseLeave={() => { if (visible) startTimer(); }}>
      <ErrorCircle16Regular className={s.icon} />
      <span className={s.message}>{message}</span>
    </div>
  );
}
