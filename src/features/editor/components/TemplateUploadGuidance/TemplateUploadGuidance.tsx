import { useShallow } from 'zustand/react/shallow';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { useDemoStore } from '@/features/demo/store/demoStore';
import { useStyles } from './TemplateUploadGuidance.styles';

export function TemplateUploadGuidance() {
  const s = useStyles();
  const { startDemo } = useDemoStore(useShallow((st) => ({ startDemo: st.startDemo })));

  // The user is already on /editor here, so a same-route <Link to="?flow=exploring">
  // would only change the query string without remounting Editor — its mount-only
  // effect would never run and the demo would never start. Trigger it directly.
  const handleStartDemo = () => {
    startDemo();
    trackEvent('demo_started');
  };

  return (
    <div className={s.root}>
      <p className={s.title}>{t('template_upload.title')}</p>
      <p className={s.description}>{t('template_upload.description')}</p>
      <p className={s.demoRow}>
        {t('template_upload.no_template')}{' '}
        <button type="button" className={s.demoLink} onClick={handleStartDemo}>
          {t('template_upload.try_demo')}
        </button>
      </p>
    </div>
  );
}
