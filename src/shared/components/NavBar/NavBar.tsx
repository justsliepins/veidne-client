import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { Navigation24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { VeidneButton } from '@/shared/components/VeidneButton';
import { Logo } from '@/shared/components/Logo';
import { useTranslation } from '@/i18n/useTranslation';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { BugReportModal } from '@/features/bug-report/components/BugReportModal';
import { useNavBarStyles } from './NavBar.styles';

interface NavBarProps {
  variant?: 'light' | 'dark';
  /** Editor header: logo, step progress (rendered by the page), and a quiet
   *  Report a bug link. No marketing nav or Start free CTA. */
  editor?: boolean;
}

export function NavBar({ variant = 'light', editor = false }: NavBarProps) {
  const styles = useNavBarStyles();
  const { t } = useTranslation();
  const isLight = variant === 'light';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const openMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);
  const openBugReport = useCallback(() => setBugReportOpen(true), []);
  const closeBugReport = useCallback(() => setBugReportOpen(false), []);

  const rootClass = mergeClasses(styles.root, isLight ? styles.light : styles.dark);
  const linkClass = mergeClasses(styles.link, isLight ? styles.linkLight : styles.linkDark);
  const drawerLinkClass = mergeClasses(styles.drawerLink, isLight ? styles.drawerLinkLight : styles.drawerLinkDark);

  if (editor) {
    return (
      <>
        <nav className={rootClass} aria-label={t('a11y.mainNavigation')}>
          <Logo />
          <div className={styles.editorActions}>
            <button type="button" className={mergeClasses(linkClass, styles.linkBtn)}
              onClick={openBugReport}>{t('nav.reportBug')}</button>
          </div>
        </nav>
        <BugReportModal open={bugReportOpen} onClose={closeBugReport} />
      </>
    );
  }

  return (
    <>
      <nav className={rootClass} aria-label={t('a11y.mainNavigation')}>
        <Logo />

        {/* Desktop nav links — hidden below md */}
        <div className={styles.nav}>
          <button type="button" className={mergeClasses(linkClass, styles.linkBtn)}
            onClick={() => useTemplateStore.getState().openLibrary()}>{t('nav.templates')}</button>
          <Link to="/roadmap" className={linkClass}>{t('nav.roadmap')}</Link>
          <Link to="/about" className={linkClass}>{t('nav.about')}</Link>
          <button type="button" className={mergeClasses(linkClass, styles.linkBtn)}
            onClick={openBugReport}>{t('nav.reportBug')}</button>
          <Link to="/editor" style={{ textDecorationLine: 'none' }}>
            <VeidneButton appearance="primary">{t('nav.startFree')}</VeidneButton>
          </Link>
        </div>

        {/* Mobile hamburger — visible below md */}
        <button
          type="button"
          className={mergeClasses(styles.hamburger, isLight ? styles.hamburgerLight : styles.hamburgerDark)}
          onClick={openMenu}
          aria-label={t('a11y.openMenu')}
        >
          <Navigation24Regular />
        </button>
      </nav>

      {/* Mobile drawer backdrop */}
      <div
        className={mergeClasses(styles.backdrop, mobileMenuOpen && styles.backdropOpen)}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile slide-in drawer */}
      <div
        className={mergeClasses(
          styles.drawer,
          isLight ? styles.drawerLight : styles.drawerDark,
          mobileMenuOpen && styles.drawerOpen,
        )}
        role="dialog"
        aria-label={t('a11y.mobileMenu')}
      >
        <button
          type="button"
          className={mergeClasses(styles.drawerClose, isLight ? styles.drawerCloseLight : styles.drawerCloseDark)}
          onClick={closeMenu}
          aria-label={t('a11y.closeMenu')}
        >
          <Dismiss24Regular />
        </button>

        <div className={styles.drawerNav}>
          <button
            type="button"
            className={drawerLinkClass}
            onClick={() => { useTemplateStore.getState().openLibrary(); closeMenu(); }}
          >
            {t('nav.templates')}
          </button>
          <Link to="/roadmap" className={drawerLinkClass} onClick={closeMenu}>
            {t('nav.roadmap')}
          </Link>
          <Link to="/about" className={drawerLinkClass} onClick={closeMenu}>
            {t('nav.about')}
          </Link>
          <button
            type="button"
            className={drawerLinkClass}
            onClick={() => { openBugReport(); closeMenu(); }}
          >
            {t('nav.reportBug')}
          </button>
        </div>

        <div className={styles.drawerCta}>
          <Link to="/editor" className={styles.drawerCtaLink} onClick={closeMenu}>
            <VeidneButton appearance="primary" className={styles.drawerCtaBtn}>
              {t('nav.startFree')}
            </VeidneButton>
          </Link>
        </div>
      </div>

      <BugReportModal open={bugReportOpen} onClose={closeBugReport} />
    </>
  );
}
