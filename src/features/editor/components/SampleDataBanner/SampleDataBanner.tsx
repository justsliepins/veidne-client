import { t } from '@/i18n/i18n';
import { useStyles } from './SampleDataBanner.styles';

interface SampleDataBannerProps {
  onUseMyFiles: () => void;
}

export function SampleDataBanner({ onUseMyFiles }: SampleDataBannerProps) {
  const s = useStyles();

  return (
    <div className={s.root} role="status">
      <span className={s.text}>{t('instant.banner.text')}</span>
      <button type="button" className={s.button} onClick={onUseMyFiles}>
        {t('instant.banner.button')}
      </button>
    </div>
  );
}
