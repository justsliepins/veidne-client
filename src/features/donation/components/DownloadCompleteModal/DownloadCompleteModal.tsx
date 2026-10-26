import { useEffect } from 'react';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { DonateInline } from '../DonateInline';
import { useStyles } from './DownloadCompleteModal.styles';

// Same review destinations as ReviewAsk; opened in a new tab so the just-saved
// download and this surface stay put.
const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/veidne.com';
const G2_REVIEW_URL = 'https://www.g2.com/products/veidne/review_modalities/new';

interface DownloadCompleteModalProps {
  open: boolean;
  onClose: () => void;
  /** Where the modal was triggered from, e.g. 'word' or 'pdf'; sent with download_modal_shown. */
  source: string;
  /** Documents produced by the run just downloaded; named in the donate card. */
  count: number;
  /** Stable identity of the run (the generated files array); see DonateInline. */
  runKey: object;
}

// Opens after a download has been saved, never before it. The donation ask is
// the primary content, rendered by the same DonateInline card as the Done
// screen (same copy, amounts and Stripe line) with surface 'modal'; the review
// ask is a single secondary line. DoneView decides when it opens (real runs
// only; every bulk or PDF download, a 10 percent chance per single file) and
// hides the inline card for the run once this has shown, so only one ask is
// on screen at a time.
export function DownloadCompleteModal({ open, onClose, source, count, runKey }: DownloadCompleteModalProps) {
  const s = useStyles();

  // Escape-to-close, copied from DonationModal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Fire once each time the modal opens.
  useEffect(() => {
    if (open) trackEvent('download_modal_shown', { source });
  }, [open, source]);

  if (!open) return null;

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
        <div className={s.titleRow}>
          <div id="download-modal-title" className={s.title}>{t('downloadModal.title')}</div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}>
            <Dismiss24Regular />
          </button>
        </div>

        <DonateInline count={count} runKey={runKey} surface="modal" />

        {/* Review: secondary, one line, same wording as the condensed ReviewAsk. */}
        <div className={s.reviewRow}>
          {t('review.ask.condensed')}{' '}
          <a
            className={s.reviewLink}
            href={G2_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('review_g2_clicked', { source: 'download_modal' })}
          >
            {t('review.ask.cta')}
          </a>
          {' '}
          <a
            className={s.reviewLink}
            href={TRUSTPILOT_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('review_trustpilot_clicked', { source: 'download_modal' })}
          >
            {t('review.ask.ctaTrustpilot')}
          </a>
        </div>

        <button type="button" className={s.dismiss} onClick={onClose}>
          {t('downloadModal.dismiss')}
        </button>
      </div>
    </div>
  );
}
