import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/useTranslation';
import { trackEvent } from '@/services/analyticsService';
import { TRUSTPILOT_REVIEW_URL } from '@/config/constants';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useFooterStyles } from './Footer.styles';

/**
 * Footer: four labelled groups (Product, Guides, Trust, About), the funding
 * line with a link to the donation box on /about, and the copyright line.
 */
export function Footer() {
  const styles = useFooterStyles();
  const { t } = useTranslation();

  return (
    <footer className={styles.root}>
      <div className={styles.cols}>
        <nav className={styles.col} aria-label={t('footer.group.product')}>
          <span className={styles.guidesHeading}>{t('footer.group.product')}</span>
          <Link to="/editor" className={styles.link}>{t('footer.start')}</Link>
          <button type="button" className={styles.linkBtn} onClick={() => useTemplateStore.getState().openLibrary()}>
            {t('nav.templates')}
          </button>
          <Link to="/roadmap" className={styles.link}>{t('nav.roadmap')}</Link>
        </nav>
        <nav className={styles.col} aria-label={t('a11y.guidesNavigation')}>
          <span className={styles.guidesHeading}>{t('footer.guides.heading')}</span>
          <Link to="/free-online-mail-merge" className={styles.link}>{t('footer.guides.freeMailMerge')}</Link>
          <Link to="/generate-word-documents-from-excel" className={styles.link}>{t('footer.guides.wordFromExcel')}</Link>
          <Link to="/bulk-document-generation" className={styles.link}>{t('footer.guides.bulk')}</Link>
          <Link to="/mail-merge-without-word" className={styles.link}>{t('footer.guides.withoutWord')}</Link>
        </nav>
        <nav className={styles.col} aria-label={t('footer.group.trust')}>
          <span className={styles.guidesHeading}>{t('footer.group.trust')}</span>
          {/* Privacy notice, Cookies and statistics, and Accessibility join this
              group together with their prerendered pages (work package 9). */}
          <a href="https://github.com/justsliepins/veidne-client" className={styles.link} target="_blank" rel="noopener noreferrer">{t('footer.source')}</a>
        </nav>
        <nav className={styles.col} aria-label={t('footer.group.about')}>
          <span className={styles.guidesHeading}>{t('footer.group.about')}</span>
          <Link to="/about" className={styles.link}>{t('footer.about')}</Link>
          <a className={styles.link} href={TRUSTPILOT_REVIEW_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => trackEvent('review_trustpilot_clicked', { source: 'footer' })}>
            {t('footer.review')}
          </a>
        </nav>
      </div>
      <p className={styles.funding}>
        {t('footer.funding')}{' '}
        <Link to="/about#support" className={styles.fundingLink}>{t('footer.fundingLink')}</Link>
      </p>
      <p className={styles.funding}>
        <span className={styles.copyright}>{t('footer.copyright')}</span>
      </p>
    </footer>
  );
}
