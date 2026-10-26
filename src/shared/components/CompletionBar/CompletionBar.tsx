import type { ReactNode } from 'react';
import { CompletionStep } from './CompletionStep';
import { useStyles } from './CompletionBar.styles';

interface CompletionBarProps {
  steps: Array<{ label: string; status: 'complete' | 'active' | 'pending'; subLabel?: string }>;
  variant?: 'standard' | 'compact';
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function CompletionBar({ steps, variant = 'standard', leftAction, rightAction }: CompletionBarProps) {
  const s = useStyles();

  const stepElements = steps.map((step, i) => (
    <CompletionStep key={step.label} stepNumber={i + 1} label={step.label} status={step.status} subLabel={step.subLabel} />
  ));

  if (variant === 'compact') {
    return (
      <div className={s.rootCompact}>
        {leftAction}
        <div className={s.steps}>{stepElements}</div>
        {rightAction}
      </div>
    );
  }

  return (
    <div className={s.root}>
      {leftAction}
      <div className={s.steps}>{stepElements}</div>
    </div>
  );
}
