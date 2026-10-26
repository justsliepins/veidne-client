import { useEffect } from 'react';

// Mobile soft-keyboard support, first-party and dependency-free.
//
// 1. Publishes the keyboard inset (how far the on-screen keyboard intrudes from
//    the bottom) as the CSS custom property `--kb-inset` on <html>, computed
//    from the VisualViewport API. Bottom-pinned mobile surfaces (the new-field
//    sheet, the manage sheet, the docked FIELDS bar) reference it in their
//    `bottom` so they rise above the keyboard instead of hiding behind it.
// 2. On focus of any text input/textarea on a mobile-width screen, scrolls it
//    into the visible band so it clears the keyboard. Smooth scrolling is used
//    only when the user has not asked for reduced motion.
//
// Desktop is untouched: the listeners no-op above the mobile breakpoint and the
// inset resolves to 0 whenever no keyboard is shown.

const MOBILE_QUERY = '(max-width: 767px)';

function isMobile(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMobileKeyboard(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const updateInset = () => {
      if (!vv) return;
      // Gap between the layout viewport bottom and the visible (visual) viewport
      // bottom == the keyboard's intrusion. Clamp to >= 0.
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty('--kb-inset', `${inset}px`);
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
      if (!editable || !isMobile()) return;
      // Let the keyboard begin opening so the visible band is known, then center.
      window.setTimeout(() => {
        el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }, 250);
    };

    updateInset();
    document.addEventListener('focusin', onFocusIn, { passive: true });
    if (vv) {
      vv.addEventListener('resize', updateInset, { passive: true });
      vv.addEventListener('scroll', updateInset, { passive: true });
    }
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      if (vv) {
        vv.removeEventListener('resize', updateInset);
        vv.removeEventListener('scroll', updateInset);
      }
      root.style.removeProperty('--kb-inset');
    };
  }, []);
}
