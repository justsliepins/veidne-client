import { useState, useEffect } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { createDonationSession } from '@/services/donationService';
import { useStyles } from './DonationModal.styles';

interface DonationModalProps {
  open: boolean; onClose: () => void; successUrl: string; cancelUrl: string;
  /** Page that hosts the modal; sent as `surface` on donation_initiated. */
  surface: 'about' | 'roadmap';
}

// Same anchors as DonateInline (3, 5, 10 EUR), in cents.
const PRESETS = [300, 500, 1000] as const;

export function DonationModal({ open, onClose, successUrl, cancelUrl, surface }: DonationModalProps) {
  const s = useStyles();
  const [selected, setSelected] = useState<number>(500);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const amountCents = isCustom ? Math.round((parseFloat(customValue) || 0) * 100) : selected;

  const handleSubmit = async () => {
    if (amountCents < 100) { setError(t('donation.modal.error')); return; }
    setError(''); setLoading(true);
    try {
      const { sessionUrl, livemode } = await createDonationSession({ amountCents, currency: 'EUR', successUrl, cancelUrl });
      // Same point and payload as DonateInline: after the session exists, in
      // euros, with Stripe's live/test flag and the surface. A failed session
      // creation emits nothing.
      trackEvent('donation_initiated', { amount: String(amountCents / 100), livemode, surface });
      window.location.href = sessionUrl;
    } catch { setError(t('donation.modal.error')); setLoading(false); }
  };

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className={s.overlay} onClick={handleBackdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
        <div className={s.titleRow}>
          <div id="donation-modal-title" className={s.title}>{t('donation.modal.title')}</div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}><Dismiss24Regular /></button>
        </div>
        <div className={s.subtitle}>{t('donation.modal.subtitle')}</div>
        <div className={s.amountGrid}>
          {PRESETS.map(amt => (
            <button key={amt} type="button"
              className={mergeClasses(s.presetBtn, !isCustom && selected === amt && s.presetBtnSelected)}
              onClick={() => { setIsCustom(false); setSelected(amt); setError(''); }}>
              {t(`donation.modal.preset.${amt / 100}`)} {t('donation.currency')}
            </button>
          ))}
          <button type="button"
            className={mergeClasses(s.presetBtn, isCustom && s.presetBtnSelected)}
            onClick={() => { setIsCustom(true); setError(''); }}>
            {t('donation.modal.custom')}
          </button>
        </div>
        {isCustom && <input type="number" className={s.customInput} value={customValue}
          placeholder={t('donation.modal.customPlaceholder')} min="1"
          onChange={e => { setCustomValue(e.target.value); setError(''); }} />}
        <button type="button" className={s.cta} disabled={loading} onClick={handleSubmit}>
          {loading ? t('donation.modal.processing') : t('donation.modal.continue')}
        </button>
        {error && <div className={s.error}>{error}</div>}
      </div>
    </div>
  );
}
