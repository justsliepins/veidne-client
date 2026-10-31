import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldKeyholeRegular, HeartRegular, CalendarLtrRegular,
  RibbonRegular, MailRegular, DocumentSignatureRegular, TableRegular,
} from '@fluentui/react-icons';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { HeroSection } from '@/features/marketing/components/HeroSection';
import { FeatureCard } from '@/features/marketing/components/FeatureCard';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { features } from '@/config/features';
import { useTranslation } from '@/i18n/useTranslation';
import { useLandingStyles } from './Landing.styles';

const FEATURES = [
  { icon: ShieldKeyholeRegular, titleKey: 'landing.features.privacy.title', descriptionKey: 'landing.features.privacy.description' },
  { icon: HeartRegular, titleKey: 'landing.features.free.title', descriptionKey: 'landing.features.free.description' },
  { icon: CalendarLtrRegular, titleKey: 'landing.features.simple.title', descriptionKey: 'landing.features.simple.description' },
] as const;

const STEPS = [
  { titleKey: 'landing.howItWorks.step1.title', descriptionKey: 'landing.howItWorks.step1.description' },
  { titleKey: 'landing.howItWorks.step2.title', descriptionKey: 'landing.howItWorks.step2.description' },
  { titleKey: 'landing.howItWorks.step3.title', descriptionKey: 'landing.howItWorks.step3.description' },
  { titleKey: 'landing.howItWorks.step4.title', descriptionKey: 'landing.howItWorks.step4.description' },
] as const;

const DATA_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5'] as const;

const USES = [
  { icon: RibbonRegular, key: 'certificates' },
  { icon: MailRegular, key: 'letters' },
  { icon: DocumentSignatureRegular, key: 'contracts' },
  { icon: TableRegular, key: 'statements' },
] as const;

const FAQ = ['5', '1', '2', '3', '4'] as const;

export function Landing() {
  const styles = useLandingStyles();
  const { t } = useTranslation();
  const openLibrary = () => useTemplateStore.getState().openLibrary();

  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.home.title')} description={t('meta.home.description')} path="/" />

      <HeroSection />

      {/* Kept where it is today: placed under the hero so non-JS readers and AI crawlers find the guides. */}
      <nav className={styles.guidesSection} aria-label="Mail merge guides">
        <h2 className={styles.guidesHeading}>Mail merge guides</h2>
        <ul className={styles.guidesList}>
          <li><Link to="/free-online-mail-merge" className={styles.guideLink}>Free online mail merge</Link></li>
          <li><Link to="/generate-word-documents-from-excel" className={styles.guideLink}>Generate Word documents from Excel</Link></li>
          <li><Link to="/bulk-document-generation" className={styles.guideLink}>Bulk document generation</Link></li>
          <li><Link to="/mail-merge-without-word" className={styles.guideLink}>Mail merge without Word</Link></li>
        </ul>
      </nav>

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

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>{t('landing.features.heading')}</h2>
        <div className={styles.cardGrid}>
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.titleKey} icon={feature.icon} titleKey={feature.titleKey} descriptionKey={feature.descriptionKey} />
          ))}
        </div>
      </section>

      <section id="where-your-data-goes" className={styles.dataSection}>
        <h2 className={styles.sectionTitle}>{t('landing.data.heading')}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th scope="col">{t('landing.data.colWhat')}</th>
                <th scope="col">{t('landing.data.colWhere')}</th>
                <th scope="col">{t('landing.data.colKept')}</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((r) => (
                <tr key={r}>
                  <th scope="row">{t(`landing.data.${r}what`)}</th>
                  <td><span className={r === 'r1' || r === 'r2' ? styles.pillLocal : styles.pillServer}>{t(`landing.data.${r}where`)}</span></td>
                  <td>{t(`landing.data.${r}kept`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.dataNote}>
          {t('landing.data.note')}{' '}
          <a href="https://github.com/justsliepins/veidne-client" className={styles.inlineLink} target="_blank" rel="noopener noreferrer">{t('footer.source')}</a>
        </p>
      </section>

      {features.expHomeUses && (
      <section className={styles.usesSection}>
        <h2 className={styles.sectionTitle}>{t('landing.uses.heading')}</h2>
        <div className={styles.usesGrid}>
          {USES.map(({ icon: Icon, key }) => (
            <div key={key} className={styles.useCard}>
              <Icon className={styles.useIcon} aria-hidden="true" />
              <h3 className={styles.useTitle}>{t(`landing.uses.${key}.title`)}</h3>
              <p className={styles.useText}>{t(`landing.uses.${key}.description`)}</p>
            </div>
          ))}
        </div>
        <button type="button" className={styles.btnGhost} onClick={openLibrary}>
          {t('landing.uses.browse')}
        </button>
      </section>
      )}

      {features.expHomeFaq && (
      <section className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>{t('landing.faq.heading')}</h2>
        <div className={styles.faqList}>
          {FAQ.map((n) => (
            <details key={n} className={styles.faqItem}>
              <summary className={styles.faqQ}>{t(`landing.faq.q${n}`)}</summary>
              <p className={styles.faqA}>{t(`landing.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </section>
      )}

      <section className={styles.ctaSection}>
        <h2 className={styles.sectionTitle}>{t('landing.cta.heading')}</h2>
        <p className={styles.ctaSubtitle}>{t('landing.cta.subtitle')}</p>
        <div className={styles.resumeActions}>
          <Link to="/editor" className={styles.btnPrimary}>{t('landing.cta.button')}</Link>
          <Link to="/editor?flow=exploring" className={styles.btnGhost}>{t('landing.hero.ctaDemo')}</Link>
        </div>
      </section>

    </PageLayout>
  );
}
