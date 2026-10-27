import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { ErrorCircle16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './ErrorToast.styles';

interface ErrorToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  /** Follow-up actions shown under the message. A toast with actions stays
   *  until dismissed, so the actions can actually be used. */
  actions?: ReactNode;
}
const DISMISS_MS = 5000;

export function ErrorToast({ message, visible, onDismiss, actions }: ErrorToastProps) {
  const s = useStyles();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const autoDismiss = !actions;
  const startTimer = useCallback(() => {
    if (autoDismiss) timerRef.current = setTimeout(onDismiss, DISMISS_MS);
  }, [onDismiss, autoDismiss]);
  const clearTimer = () => { clearTimeout(timerRef.current); };
  useEffect(() => {
    if (visible) startTimer();
    return clearTimer;
  }, [visible, startTimer]);
  return (
    <div className={mergeClasses(s.root, visible ? s.visible : s.hidden, actions ? s.withActions : undefined)}
      role="alert" onMouseEnter={clearTimer} onMouseLeave={() => { if (visible) startTimer(); }}>
      <div className={s.row}>
        <ErrorCircle16Regular className={s.icon} />
        <span className={s.message}>{message}</span>
        {actions && (
          <button type="button" className={s.closeBtn} onClick={onDismiss} aria-label={t('common.close')}>
            <Dismiss16Regular />
          </button>
        )}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  );
}
