import { mergeClasses } from '@fluentui/react-components';
import { Checkmark16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { useStyles } from './CompletionStep.styles';

interface CompletionStepProps {
  stepNumber: number;
  label: string;
  status: 'complete' | 'active' | 'pending';
  subLabel?: string;
}

const circleClass = {
  complete: 'circleComplete' as const,
  active: 'circleActive' as const,
  pending: 'circlePending' as const,
};

const statusClass = {
  complete: 'statusComplete' as const,
  active: 'statusActive' as const,
  pending: 'statusPending' as const,
};

const statusKey = {
  complete: 'completionBar.complete',
  active: 'completionBar.inProgress',
  pending: 'completionBar.notStarted',
};

export function CompletionStep({ stepNumber, label, status, subLabel }: CompletionStepProps) {
  const s = useStyles();

  return (
    <div className={s.root}>
      <div className={mergeClasses(s.circle, s[circleClass[status]])}>
        {status === 'complete' ? (
          <Checkmark16Regular className={s.icon} />
        ) : (
          <span className={status === 'active' ? s.numberActive : s.numberPending}>
            {stepNumber}
          </span>
        )}
      </div>
      <div className={s.textColumn}>
        <span className={s.label}>{label}</span>
        <span className={s[statusClass[status]]}>{t(statusKey[status])}</span>
        {subLabel && <span className={s.subLabel} data-testid="step-sublabel">{subLabel}</span>}
      </div>
      {/* Mobile: show label badge below circle for active step only */}
      {status === 'active' && <span className={s.mobileLabel}>{label}</span>}
    </div>
  );
}
