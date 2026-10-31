import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { Navigation24Regular, Dismiss24Regular } from '@fluentui/react-icons';
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

  // Mobile drawer keyboard path (WCAG 2.4.3, 2.1.2): on open, focus moves to the
  // close button; Tab and Shift+Tab stay inside the drawer; Escape closes it;
  // on close, focus returns to the Menu button.
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      wasOpen.current = true;
      closeButtonRef.current?.focus();
      // The page behind the open drawer is out of reach for a screen reader's
      // virtual cursor too, not only for Tab (review c, finding 18).
      const behind = [document.getElementById('main-content'), document.querySelector('footer')].filter((el): el is HTMLElement => el !== null);
      behind.forEach((el) => el.setAttribute('inert', ''));
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMobileMenuOpen(false);
          return;
        }
        if (e.key !== 'Tab' || !drawerRef.current) return;
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        behind.forEach((el) => el.removeAttribute('inert'));
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      menuButtonRef.current?.focus();
    }
  }, [mobileMenuOpen]);
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
          {/* One link styled as a button: no <a><button> nesting. */}
          <Link to="/editor" className={styles.ctaLink}>{t('nav.startFree')}</Link>
        </div>

        {/* Mobile hamburger — visible below md */}
        <button
          type="button"
          className={mergeClasses(styles.hamburger, isLight ? styles.hamburgerLight : styles.hamburgerDark)}
          onClick={openMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          ref={menuButtonRef}
        >
          <Navigation24Regular aria-hidden="true" />
          <span className={styles.menuWord}>{t('nav.menu')}</span>
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
        id="mobile-menu"
        ref={drawerRef}
        role="dialog"
        aria-label={t('a11y.mobileMenu')}
        aria-modal="true"
        {...(!mobileMenuOpen ? { inert: '' } : {})}
      >
        <button
          type="button"
          className={mergeClasses(styles.drawerClose, isLight ? styles.drawerCloseLight : styles.drawerCloseDark)}
          onClick={closeMenu}
          aria-label={t('a11y.closeMenu')}
          ref={closeButtonRef}
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
          <Link to="/editor" className={mergeClasses(styles.ctaLink, styles.drawerCtaFull)} onClick={closeMenu}>
            {t('nav.startFree')}
          </Link>
        </div>
      </div>

      <BugReportModal open={bugReportOpen} onClose={closeBugReport} />
    </>
  );
}
