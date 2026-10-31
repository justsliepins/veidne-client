import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mergeClasses } from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { createDonationSession } from '@/services/donationService';
import { parseWholeEuros } from '../../utils/amount';
import { forgetDonateFromDone } from '../../utils/askMemory';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useStyles } from './DonationModal.styles';

interface DonationModalProps {
  open: boolean; onClose: () => void; successUrl: string; cancelUrl: string;
  /** Page that hosts the modal; sent as `surface` on donation_initiated. */
  surface: 'about' | 'roadmap';
}

// Same anchors as DonateInline (3, 5, 10 EUR), in cents.
const PRESETS = [300, 500, 1000] as const;

// The amount choice works like the Done screen card (DonateInline): the chosen
// amount is a pressed button in a labelled group, "Custom" reveals a labelled
// whole-euro field, and the button names the amount it will charge.
export function DonationModal({ open, onClose, successUrl, cancelUrl, surface }: DonationModalProps) {
  const s = useStyles();
  const [selected, setSelected] = useState<number>(500);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customError, setCustomError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useDialogFocus(open, cardRef, titleRef, onClose);

  if (!open) return null;

  // The field keeps what was typed; only whole euros, 1 or more, are an amount
  // (review a, finding 5). Spaces and "EUR" are ignored, a comma or dot is not.
  const customEuros = parseWholeEuros(customValue);
  const amountCents = isCustom ? (customEuros !== null ? customEuros * 100 : null) : selected;

  const handleSubmit = async () => {
    if (amountCents === null || loading) return;
    setError(''); setLoading(true);
    try {
      const { sessionUrl, livemode } = await createDonationSession({ amountCents, currency: 'EUR', successUrl, cancelUrl });
      // Same point and payload as DonateInline: after the session exists, in
      // euros, with Stripe's live/test flag and the surface. A failed session
      // creation emits nothing.
      trackEvent('donation_initiated', { amount: String(amountCents / 100), livemode, surface });
      // A same-tab checkout: the thank-you page must not mention another tab
      // left open by an earlier checkout from the Done screen.
      forgetDonateFromDone();
      window.location.href = sessionUrl;
    } catch { setError(t('donation.modal.error')); setLoading(false); }
  };

  const chooseCustom = () => {
    setIsCustom(true); setError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return createPortal(
    <div className={s.overlay} onClick={handleBackdrop}>
      <div ref={cardRef} className={s.card} role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
        <div className={s.titleRow}>
          <h2 id="donation-modal-title" ref={titleRef} tabIndex={-1} className={s.title}>{t('donation.modal.title')}</h2>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}><Dismiss24Regular /></button>
        </div>
        <div className={s.subtitle}>{t('donation.modal.subtitle')}</div>
        <div className={s.amountGrid} role="group" aria-label={t('donate.inline.chooseLbl')}>
          {PRESETS.map(amt => {
            const active = !isCustom && selected === amt;
            return (
              <button key={amt} type="button" aria-pressed={active}
                className={mergeClasses(s.presetBtn, active && s.presetBtnSelected)}
                onClick={() => { setIsCustom(false); setSelected(amt); setError(''); }}>
                {t(`donation.modal.preset.${amt / 100}`)} {t('donation.currency')}
              </button>
            );
          })}
          <button type="button" aria-pressed={isCustom}
            className={mergeClasses(s.presetBtn, isCustom && s.presetBtnSelected)}
            onClick={chooseCustom}>
            {t('donation.modal.custom')}
          </button>
        </div>
        {isCustom && (
          <div className={s.customField}>
            <label htmlFor="donation-modal-custom-amount" className={s.customLabel}>{t('donate.inline.customLbl')}</label>
            <input id="donation-modal-custom-amount" ref={inputRef} type="text" inputMode="numeric"
              autoComplete="off" className={s.customInput} value={customValue}
              aria-describedby={customError ? 'donation-modal-custom-hint donation-modal-custom-error' : 'donation-modal-custom-hint'}
              aria-invalid={customError || undefined}
              onChange={e => { setCustomValue(e.target.value); setError(''); setCustomError(false); }}
              onBlur={() => setCustomError(customValue.trim() !== '' && customEuros === null)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                if (customEuros === null) setCustomError(true); else void handleSubmit();
              }} />
            <div id="donation-modal-custom-hint" className={s.customHint}>{t('donate.inline.customHint')}</div>
            {customError && <div id="donation-modal-custom-error" className={s.error} role="alert">{t('donate.inline.customError')}</div>}
          </div>
        )}
        <button type="button" className={s.cta} disabled={loading || amountCents === null} onClick={() => void handleSubmit()}>
          {loading ? t('donation.modal.processing')
            : amountCents === null ? t('donate.inline.ctaBare')
              : t('donate.inline.cta', { amount: String(amountCents / 100) })}
        </button>
        <p className={s.stripeNote}>{t('donation.modal.stripe')}</p>
        {error && <div className={s.error} role="alert">{error}</div>}
      </div>
    </div>,
    document.body,
  );
}
