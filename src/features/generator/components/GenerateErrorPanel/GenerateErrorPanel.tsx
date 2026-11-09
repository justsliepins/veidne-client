import { useEffect, useRef } from 'react';
import { ErrorCircle20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { TRUSTPILOT_REVIEW_URL } from '@/config/constants';
import { partName } from '@/features/editor/utils/templateSyntaxMessage';
import { focusAfterDialog } from '@/shared/utils/focusAfterDialog';
import type { GenerateFailure } from '../../utils/generateFailure';
import { useStyles } from './GenerateErrorPanel.styles';

interface GenerateErrorPanelProps {
  failure: GenerateFailure;
  /** Bumped on every failed run, so focus comes back to the panel each time. */
  attempt: number;
  onRetry: () => void;
  onGoToFields: () => void;
  onReport: () => void;
  onDismiss: () => void;
}

// A failed Generate run, shown where the user works (top of the preview), not
// as a toast: it names the cause when the template engine reports one, offers
// the one action that fixes it, and stays until dismissed or the next run.
export function GenerateErrorPanel({ failure, attempt, onRetry, onGoToFields, onReport, onDismiss }: GenerateErrorPanelProps) {
  const s = useStyles();
  const ref = useRef<HTMLElement>(null);

  // Focus moves here on every failure, also from the Generate button that was
  // just pressed (a run that fails on its first document never shows the
  // progress dialog), so the failure is what a screen reader reads next
  // (WCAG 2.4.3, 4.1.3).
  useEffect(() => focusAfterDialog(() => ref.current, { force: true }), [attempt]);

  const cause = failure.kind === 'fieldName'
    ? t('error.generate.cause.fieldName', { name: failure.name, char: failure.char })
    : failure.kind === 'template'
      ? t('error.generate.cause.template', { explanation: failure.explanation, part: partName(failure.file) })
      : failure.kind === 'controls'
        ? t('error.generate.cause.controls')
        : t('error.generate.cause.unknown');

  const report = (primary: boolean) => (
    <button type="button" className={primary ? s.primary : s.secondary} onClick={onReport}>
      {t('error.generate.report')}
    </button>
  );

  return (
    <section ref={ref} className={s.root} role="alert" tabIndex={-1}
      aria-labelledby="generate-error-title" data-testid="generate-error">
      <div className={s.head}>
        <ErrorCircle20Regular className={s.icon} aria-hidden="true" />
        <h2 id="generate-error-title" className={s.title}>{t('error.generate')}</h2>
        <button type="button" className={s.close} onClick={onDismiss} aria-label={t('common.close')}>
          <Dismiss20Regular />
        </button>
      </div>
      <p className={s.cause} data-testid="generate-error-cause">{cause}</p>
      <div className={s.actions}>
        {failure.kind === 'fieldName' && (
          <>
            <button type="button" className={s.primary} onClick={onGoToFields}>{t('error.generate.toFields')}</button>
            {report(false)}
          </>
        )}
        {failure.kind === 'template' && report(true)}
        {failure.kind === 'unknown' && (
          <>
            <button type="button" className={s.primary} onClick={onRetry}>{t('error.generate.retry')}</button>
            {report(false)}
          </>
        )}
        <a className={s.link} href={TRUSTPILOT_REVIEW_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => trackEvent('review_trustpilot_clicked', { source: 'error' })}>
          {t('error.generate.review')}
        </a>
      </div>
    </section>
  );
}
