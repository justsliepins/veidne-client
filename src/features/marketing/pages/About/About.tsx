import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { DonationModal } from '@/features/donation/components/DonationModal';
import { useTranslation } from '@/i18n/useTranslation';
import { useAboutStyles } from './About.styles';

export function About() {
  const styles = useAboutStyles();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [donationOpen, setDonationOpen] = useState(false);
  const donated = searchParams.get('donated') === 'true';
  // No window during the static prerender (see src/prerender/render.tsx).
  const origin = typeof window === 'undefined' ? 'https://veidne.com' : window.location.origin;

  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.about.title')} description={t('meta.about.description')} path="/about" />
      <div className={styles.root}>
        <h1 className={styles.pageTitle}>{t('about.pageTitle')}</h1>

        <section className={styles.section}>
          <p className={styles.storyParagraph}>{t('about.story.p1')}</p>
          <p className={styles.storyParagraph}>{t('about.story.p2')}</p>
          <p className={styles.storyParagraph}>{t('about.story.p3')}</p>
          <p className={styles.storyParagraph}>
            {t('about.story.p4start')}
            <strong className={styles.boldText}>{t('about.story.p4bold')}</strong>
            {t('about.story.p4end')}
          </p>
          <p className={styles.storyParagraph}>{t('about.story.pdf')}</p>
          <p className={styles.storyParagraph}>
            {t('about.story.openSourceStart')}
            <a className={styles.inlineLink} href="https://github.com/justsliepins/veidne-client" target="_blank" rel="noopener noreferrer">
              {t('about.story.openSourceLink')}
            </a>
            {t('about.story.openSourceEnd')}
          </p>
          <p className={styles.storyParagraph}>{t('about.story.p5')}</p>
        </section>

        <section className={styles.founders}>
          <p className={styles.founderQuote}>{t('about.founders.message')}</p>
          <span className={styles.foundersName}>{t('about.founders.names')}</span>
        </section>

        <section className={styles.section} aria-labelledby="about-costs-heading">
          <h2 id="about-costs-heading" className={styles.costsHeading}>{t('about.costs.heading')}</h2>
          <p className={styles.storyParagraph}>{t('about.costs.p1')}</p>
          <p className={styles.storyParagraph}>{t('about.costs.p2')}</p>
        </section>

        <div className={styles.supportBox}>
          <h3 className={styles.supportHeading}>{t('about.support.heading')}</h3>
          <p className={styles.supportDescription}>{t('about.support.description')}</p>
          {donated && <p className={styles.thankYou}>{t('donation.modal.thankYou')}</p>}
          <VeidneButton appearance="primary" onClick={() => setDonationOpen(true)}>{t('about.support.cta')}</VeidneButton>
        </div>
        <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} surface="about"
          successUrl={`${origin}/about?donated=true`}
          cancelUrl={`${origin}/about`} />
      </div>
    </PageLayout>
  );
}
