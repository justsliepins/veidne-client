import { useEffect, useLayoutEffect, useRef } from 'react';
import { t } from '@/i18n/i18n';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/services/analyticsService';
import { useConsentStore } from './consentStore';
import { useConsentBannerStyles } from './ConsentBanner.styles';

/** CSS variable PageLayout pads its bottom with while the banner is shown. */
export const CONSENT_HEIGHT_VAR = '--consent-banner-h';

/**
 * Asks once whether Veidne may use its statistics cookie (work package 14).
 *
 * Not modal: the page can be read and used before answering. It does not take
 * focus on a first visit; it is the first stop for the keyboard after the skip
 * link, so it is found without tabbing through the page. Opened again from the
 * privacy notice, it takes focus and gives it back afterwards.
 */
export function ConsentBanner() {
  const s = useConsentBannerStyles();
  const { open, reopened, choice, choose, dismiss } = useConsentStore();
  const onPrivacyPage = useLocation().pathname === '/privacy';
  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Where the keyboard came from, so focus can go back there afterwards
  // instead of being lost when the banner disappears.
  const returnTo = useRef<HTMLElement | null>(null);

  // Reserve the banner's height at the end of the page while it is shown.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = rootRef.current;
    if (!open || !el) { root.style.removeProperty(CONSENT_HEIGHT_VAR); return; }
    const update = () => root.style.setProperty(CONSENT_HEIGHT_VAR, `${el.offsetHeight}px`);
    update();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => { ro?.disconnect(); root.style.removeProperty(CONSENT_HEIGHT_VAR); };
  }, [open]);

  useEffect(() => {
    if (!open || !reopened) return;
    const active = document.activeElement;
    // The control that opened it (in development, StrictMode runs this twice:
    // the second time focus is already on the heading, which is not a target).
    if (active instanceof HTMLElement && active !== document.body && !rootRef.current?.contains(active)) returnTo.current = active;
    headingRef.current?.focus();
  }, [open, reopened]);

  if (!open) return null;

  // Only when focus is in the banner, which is about to disappear: back to
  // where the keyboard came from, or else to the start of the page content
  // (PD-13), never lost on the body.
  const restoreFocus = () => {
    const target = returnTo.current;
    returnTo.current = null;
    if (!rootRef.current?.contains(document.activeElement)) return;
    requestAnimationFrame(() => {
      if (target && target.isConnected) { target.focus(); return; }
      const main = document.getElementById('main-content');
      if (!main) return;
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    });
  };

  const handleChoice = (statistics: boolean) => {
    const surface = reopened ? 'privacy' : 'banner';
    // The choice is stored first. A refusal goes out with it ("none"), so the
    // server removes an old cookie in its reply; consent goes out without any
    // identifier, so the choice itself is never tied to a browser.
    choose(statistics);
    trackEvent('consent_choice', { choice: statistics ? 'granted' : 'denied', surface }, { anonymous: statistics });
    restoreFocus();
  };

  const handleFocus = (e: React.FocusEvent) => {
    const from = e.relatedTarget;
    if (from instanceof HTMLElement && !rootRef.current?.contains(from) && returnTo.current === null) returnTo.current = from;
  };
  // Focus that leaves the banner for the page forgets where it came from.
  const handleBlur = (e: React.FocusEvent) => {
    const to = e.relatedTarget;
    if (!(to instanceof Node) || !rootRef.current?.contains(to)) returnTo.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only a banner opened again can be closed without a choice: the earlier
    // choice then stays as it was.
    if (e.key === 'Escape' && reopened && choice !== null) { dismiss(); restoreFocus(); }
  };

  const current = choice === 'granted' ? t('consent.currentGranted') : choice === 'denied' ? t('consent.currentDenied') : '';

  return (
    <section ref={rootRef} id="consent-banner" className={s.root} aria-labelledby="consent-banner-title"
      onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div className={s.inner}>
        <div className={s.text}>
          <h2 id="consent-banner-title" ref={headingRef} tabIndex={-1} className={s.heading}>{t('consent.title')}</h2>
          <p className={s.body}>
            {t('consent.body')}{' '}
            {current && <>{current}{' '}</>}
            {/* On the notice itself, a jump to its section. Elsewhere a new tab,
                so work in the editor stays open; the choice made there reaches
                this tab too (consentStore). */}
            {onPrivacyPage
              ? <a className={s.link} href="#cookies">{t('consent.more')}</a>
              : <a className={s.link} href="/privacy#cookies" target="_blank" rel="noopener">{t('consent.more')}<span className={s.srOnly}> {t('common.newTab')}</span></a>}
          </p>
        </div>
        <div className={s.actions}>
          <button type="button" className={s.choice} onClick={() => handleChoice(true)}>{t('consent.allow')}</button>
          <button type="button" className={s.choice} onClick={() => handleChoice(false)}>{t('consent.deny')}</button>
        </div>
      </div>
    </section>
  );
}
