import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]';

/**
 * Keyboard and screen reader behaviour for the hand-built dialogs (the About
 * and Roadmap donation dialog, the bug report form), the same as the
 * post-download dialog already has:
 *  - on open, focus moves to `initialRef` (the dialog title) and the app root
 *    (#root) becomes inert, which is what aria-modal="true" promises;
 *  - Tab and Shift+Tab cycle inside `containerRef`;
 *  - Escape calls `onEscape`;
 *  - on close, focus returns to the control that opened the dialog when it is
 *    still on the page.
 * The dialog must render outside #root (createPortal to document.body), or it
 * would be inert itself.
 */
export function useDialogFocus(open: boolean, containerRef: RefObject<HTMLElement>, initialRef: RefObject<HTMLElement>, onEscape: () => void): void {
  // The latest onEscape without re-running the effect when a parent passes a
  // new function on every render.
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; });

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const app = document.getElementById('root');
    app?.setAttribute('inert', '');
    const raf = requestAnimationFrame(() => initialRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); escapeRef.current(); return; }
      if (e.key !== 'Tab' || !containerRef.current) return;
      const items = [...containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === initialRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      app?.removeAttribute('inert');
      if (returnTo && document.contains(returnTo) && !returnTo.closest('[inert]')) returnTo.focus();
    };
  }, [open, containerRef, initialRef]);
}
