import { Link } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { useTranslation } from '@/i18n/useTranslation';
import { trackEvent } from '@/services/analyticsService';
import { TRUSTPILOT_REVIEW_URL } from '@/config/constants';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { operatorParams } from '@/shared/utils/operator';
import { useConsentStore } from '@/features/consent/consentStore';
import { useFooterStyles } from './Footer.styles';

/**
 * Footer: four labelled groups (Product, Guides, Trust, About), the funding
 * line with a link to the donation box on /about, and the copyright and
 * operator line. Every internal target is a prerendered page or /editor.
 */
export function Footer() {
  const operator = operatorParams();
  const operatorReady = !Object.values(operator).some((v) => v.includes('[TO FILL:'));
  const styles = useFooterStyles();
  const { t } = useTranslation();
  const reopenConsent = useConsentStore((st) => st.reopen);

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
          <Link to="/privacy" className={styles.link}>{t('footer.privacy')}</Link>
          <Link to="/privacy#cookies" className={styles.link}>{t('footer.cookies')}</Link>
          {/* Opens the cookie banner again on any page (CTA-27). */}
          <button type="button" className={mergeClasses(styles.link, styles.linkButton)} onClick={reopenConsent}>{t('footer.cookieChoice')}</button>
          <a href="https://github.com/justsliepins/veidne-client" className={styles.link} target="_blank" rel="noopener noreferrer">{t('footer.source')}</a>
          <Link to="/accessibility" className={styles.link}>{t('footer.accessibility')}</Link>
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
        {/* Only with the owner's real details: a placeholder is never shown as
            a fact on a public page (review c, finding 1). npm run check:legal
            still fails while /privacy or /accessibility has one. */}
        {operatorReady && <>{' '}{t('footer.operator', operator)}</>}
      </p>
    </footer>
  );
}
