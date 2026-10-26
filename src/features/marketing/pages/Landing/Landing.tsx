import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ShieldKeyholeRegular, HeartRegular, FlashRegular } from '@fluentui/react-icons';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { HeroSection } from '@/features/marketing/components/HeroSection';
import { FeatureCard } from '@/features/marketing/components/FeatureCard';
import { useTranslation } from '@/i18n/useTranslation';
import { useLandingStyles } from './Landing.styles';

const FEATURES = [
  { icon: ShieldKeyholeRegular, titleKey: 'landing.features.privacy.title', descriptionKey: 'landing.features.privacy.description' },
  { icon: HeartRegular, titleKey: 'landing.features.free.title', descriptionKey: 'landing.features.free.description' },
  { icon: FlashRegular, titleKey: 'landing.features.simple.title', descriptionKey: 'landing.features.simple.description' },
] as const;

const STEPS = [
  { titleKey: 'landing.howItWorks.step1.title', descriptionKey: 'landing.howItWorks.step1.description' },
  { titleKey: 'landing.howItWorks.step2.title', descriptionKey: 'landing.howItWorks.step2.description' },
  { titleKey: 'landing.howItWorks.step3.title', descriptionKey: 'landing.howItWorks.step3.description' },
  { titleKey: 'landing.howItWorks.step4.title', descriptionKey: 'landing.howItWorks.step4.description' },
] as const;

export function Landing() {
  const styles = useLandingStyles();
  const { t } = useTranslation();
  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.home.title')} description={t('meta.home.description')} path="/" />
      <HeroSection />

      <nav className={styles.guidesSection} aria-label="Mail merge guides">
        <h2 className={styles.guidesHeading}>Mail merge guides</h2>
        <ul className={styles.guidesList}>
          <li>
            <Link to="/free-online-mail-merge" className={styles.guideLink}>Free online mail merge</Link>
          </li>
          <li>
            <Link to="/generate-word-documents-from-excel" className={styles.guideLink}>Generate Word documents from Excel</Link>
          </li>
          <li>
            <Link to="/bulk-document-generation" className={styles.guideLink}>Bulk document generation</Link>
          </li>
          <li>
            <Link to="/mail-merge-without-word" className={styles.guideLink}>Mail merge without Word</Link>
          </li>
        </ul>
      </nav>

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>{t('landing.features.heading')}</h2>
        <div className={styles.cardGrid}>
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.titleKey} icon={feature.icon} titleKey={feature.titleKey} descriptionKey={feature.descriptionKey} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className={styles.howItWorksSection}>
        <h2 className={styles.sectionTitle}>{t('landing.howItWorks.heading')}</h2>
        <div className={styles.stepGrid}>
          {STEPS.map((step, index) => (
            <Fragment key={step.titleKey}>
              {index > 0 && <span className={styles.stepConnector} aria-hidden="true" />}
              <div className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3 className={styles.stepTitle}>{t(step.titleKey)}</h3>
                <p className={styles.stepDescription}>{t(step.descriptionKey)}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2 className={styles.sectionTitle}>{t('landing.cta.heading')}</h2>
        <p className={styles.ctaSubtitle}>{t('landing.cta.subtitle')}</p>
        <Link to="/editor?flow=template-data" className={styles.ctaLink}>
          <VeidneButton appearance="primary">
            {t('landing.cta.button')}
          </VeidneButton>
        </Link>
      </section>
    </PageLayout>
  );
}
