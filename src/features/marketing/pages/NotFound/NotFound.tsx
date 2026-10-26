import { Link } from 'react-router-dom';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import { useTranslation } from '@/i18n/useTranslation';
import { useNotFoundStyles } from './NotFound.styles';

export function NotFound() {
  const styles = useNotFoundStyles();
  const { t } = useTranslation();
  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.notFound.title')} description={t('meta.notFound.description')} path="/404" noindex />
      <div className={styles.root}>
        <h1 className={styles.title}>{t('notFound.title')}</h1>
        <p className={styles.subtitle}>{t('notFound.subtitle')}</p>
        <Link to="/" className={styles.link}>
          <VeidneButton appearance="primary">{t('notFound.goHome')}</VeidneButton>
        </Link>
      </div>
    </PageLayout>
  );
}
