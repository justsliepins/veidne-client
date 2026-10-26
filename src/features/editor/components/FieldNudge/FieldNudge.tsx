import { Info16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './FieldNudge.styles';

interface FieldNudgeProps {
  text: string;
  onDismiss: () => void;
}

/**
 * Persistent instruction line shown above the document on the Fields step. Its
 * copy adapts to how many fields exist (an invitation when there are none, a
 * count plus a prompt to add more once some are detected); the parent appends a
 * picture line when the image flag is on. It is dismissible, and the parent
 * retires it for good after the first manually created field.
 */
export function FieldNudge({ text, onDismiss }: FieldNudgeProps) {
  const s = useStyles();
  return (
    <div className={s.root} role="status">
      <Info16Regular className={s.icon} aria-hidden="true" />
      <span className={s.text}>{text}</span>
      <button
        type="button"
        className={s.dismiss}
        onClick={onDismiss}
        aria-label={t('placeholder.nudge.dismiss')}
      >
        <Dismiss16Regular />
      </button>
    </div>
  );
}
