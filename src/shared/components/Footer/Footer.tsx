import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/useTranslation';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useFooterStyles } from './Footer.styles';

export function Footer() {
  const styles = useFooterStyles();
  const { t } = useTranslation();

  return (
    <footer className={styles.root}>
      <div className={styles.left}>
        <span className={styles.copyright}>{t('footer.copyright')}</span>
      </div>
      <nav className={styles.guides} aria-label={t('a11y.guidesNavigation')}>
        <span className={styles.guidesHeading}>{t('footer.guides.heading')}</span>
        <Link to="/free-online-mail-merge" className={styles.link}>{t('footer.guides.freeMailMerge')}</Link>
        <Link to="/generate-word-documents-from-excel" className={styles.link}>{t('footer.guides.wordFromExcel')}</Link>
        <Link to="/bulk-document-generation" className={styles.link}>{t('footer.guides.bulk')}</Link>
        <Link to="/mail-merge-without-word" className={styles.link}>{t('footer.guides.withoutWord')}</Link>
      </nav>
      <nav className={styles.right} aria-label={t('a11y.footerNavigation')}>
        <Link to="/editor" className={styles.link}>{t('footer.start')}</Link>
        <button type="button" className={styles.linkBtn} onClick={() => useTemplateStore.getState().openLibrary()}>
          {t('nav.templates')}
        </button>
        <Link to="/roadmap" className={styles.link}>{t('nav.roadmap')}</Link>
        <Link to="/about" className={styles.link}>{t('footer.about')}</Link>
      </nav>
      {/* Funding line: a quiet fact at the very bottom, never a banner and not
          dismissible. The editor hides the whole footer, so it never shows there. */}
      <p className={styles.funding}>
        {t('footer.funding')}{' '}
        <Link to="/about" className={styles.fundingLink}>{t('footer.fundingLink')}</Link>
      </p>
    </footer>
  );
}
