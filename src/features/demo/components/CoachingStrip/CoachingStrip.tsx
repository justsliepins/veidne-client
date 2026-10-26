import { Info16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import type { DemoStep } from '../../store/demoStore';
import { getCoachingMessage } from '../../store/demoStore';
import { useStyles } from './CoachingStrip.styles';

interface Props {
  demoStep: DemoStep;
  onSkip: () => void;
  onLoadData: () => void;
  onUploadMyDocument: () => void;
  onExploreMore: () => void;
}

export function CoachingStrip({ demoStep, onSkip, onLoadData, onUploadMyDocument, onExploreMore }: Props) {
  const s = useStyles();
  const messageKey = getCoachingMessage(demoStep);

  if (demoStep === 'step5_cta') {
    return (
      <div className={s.ctaRoot}>
        <div className={s.ctaHeading}>{t('demo.coaching.step5.heading')}</div>
        <div className={s.ctaBtnRow}>
          <button type="button" className={s.ctaPrimary} onClick={onUploadMyDocument}>
            {t('demo.coaching.step5.primary')}
          </button>
          <button type="button" className={s.ctaGhost} onClick={onExploreMore}>
            {t('demo.coaching.step5.secondary')}
          </button>
        </div>
      </div>
    );
  }

  if (!messageKey) return null;

  return (
    <div className={s.root}>
      <Info16Regular className={s.icon} />
      <span className={s.message} key={messageKey}>{t(messageKey)}</span>
      {demoStep === 'step3_kit' && (
        <button type="button" className={s.loadBtn} onClick={onLoadData}>
          {t('demo.loadSampleData')}
        </button>
      )}
      <button type="button" className={s.skip} onClick={onSkip}>
        {t('demo.coaching.skip')}
      </button>
    </div>
  );
}
