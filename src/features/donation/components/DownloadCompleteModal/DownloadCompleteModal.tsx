import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dismiss24Regular, CheckmarkCircle20Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { trackEvent } from '@/services/analyticsService';
import { DonateInline } from '../DonateInline';
import { useStyles } from './DownloadCompleteModal.styles';

export type DismissMethod = 'no_thanks' | 'close' | 'escape' | 'backdrop';

interface DownloadCompleteModalProps {
  open: boolean;
  onClose: (method: DismissMethod) => void;
  /** Where the modal was triggered from, e.g. 'word' or 'pdf'; sent with download_modal_shown. */
  source: string;
  /** Documents produced by the run just downloaded; named in the donate card. */
  count: number;
  /** Documents actually downloaded so far (all of them after the zip or the
   *  PDFs, otherwise the single files); named in the first line. */
  savedCount: number;
  /** Checkout opened in a new tab from the card: the dialog closes without a
   *  dismissal. */
  onCheckoutOpened?: () => void;
  /** Stable identity of the run (the generated files array); see DonateInline. */
  runKey: object;
}

// The one donation dialog of a run (audit nov 2026). It opens after the first
// download has been saved, never before, at most once per run, and not for a
// while after "No thanks" or after a donation (DoneView decides). It says
// first that the files are saved, so it cannot read as a step the download
// waits on, and declining is a button of the same size as donating. It asks
// for money only: the review ask stays on the Done screen, not in this dialog.
//
// Focus: moved to the title on open, kept inside while open, returned to the
// control that had it on close. The page behind is made inert, which is what
// aria-modal claims.
export function DownloadCompleteModal({ open, onClose, source, count, savedCount, onCheckoutOpened, runKey }: DownloadCompleteModalProps) {
  const s = useStyles();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    trackEvent('download_modal_shown', { source });
    returnTo.current = document.activeElement as HTMLElement | null;
    const app = document.getElementById('root');
    app?.setAttribute('inert', '');
    requestAnimationFrame(() => titleRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose('escape'); return; }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const items = cardRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]):not([tabindex="-1"]), [tabindex="0"]');
      if (items.length === 0) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      app?.removeAttribute('inert');
      // The trigger may be gone (PDF flow re-renders); fall back to the page heading.
      const back = returnTo.current;
      if (back && document.contains(back)) back.focus();
      else document.querySelector<HTMLElement>('[data-done-heading]')?.focus();
    };
  }, [open, source, onClose]);

  if (!open) return null;

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose('backdrop'); };

  return createPortal(
    <div className={s.overlay} onClick={handleBackdrop}>
      <div ref={cardRef} className={s.card} role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
        <div className={s.titleRow}>
          <div>
            <p className={s.saved}><CheckmarkCircle20Regular aria-hidden="true" />{tCount(savedCount, 'downloadModal.saved')}</p>
            <h2 id="download-modal-title" ref={titleRef} tabIndex={-1} className={s.title}>{t('downloadModal.title')}</h2>
          </div>
          <button type="button" className={s.closeBtn} onClick={() => onClose('close')} aria-label={t('common.close')}>
            <Dismiss24Regular />
          </button>
        </div>

        <DonateInline count={count} runKey={runKey} surface="modal" onCheckoutOpened={onCheckoutOpened} />

        <button type="button" className={s.dismiss} onClick={() => onClose('no_thanks')}>
          {t('downloadModal.dismiss')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
