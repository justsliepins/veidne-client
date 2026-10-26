import { useState, useRef, useCallback, useEffect } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { tCount } from '@/i18n/plural';
import { trackEvent } from '@/services/analyticsService';
import { createDonationSession } from '@/services/donationService';
import { useStyles } from './DonateInline.styles';

// Preset anchors in whole euros, each with a sub-label key that says what the
// amount covers in hosting. 5 starts selected, the same default as DonationModal.
const PRESETS = [
  { amount: 3, subKey: 'donate.inline.sub3' },
  { amount: 5, subKey: 'donate.inline.sub5' },
  { amount: 10, subKey: 'donate.inline.sub10' },
] as const;
const DEFAULT_AMOUNT = 5;

/** Where the card is rendered. Sent as `surface` on donation_ask_shown and
 *  donation_initiated so impressions and clicks from the Done screen card and
 *  the post-download modal are never mixed into one number. */
export type DonateSurface = 'inline' | 'modal';

// Identity of the generation run the impression event was last sent for, per
// surface. A module-level value, not a ref, because the card can mount more
// than once for the same run: StrictMode in development, the PDF consent gate
// hiding and re-showing it, and the stale-phase remount of Editor that
// re-renders the Done screen for a moment. All of those hand the card the same
// run object, so the event fires once per real run and surface.
const askShownForRun: Record<DonateSurface, object | null> = { inline: null, modal: null };

interface DonateInlineProps {
  /** Documents produced by the run just finished; named in the card title. */
  count: number;
  /** Stable identity of the run (the generated files array); gates the
   *  donation_ask_shown event to once per run. */
  runKey: object;
  surface: DonateSurface;
}

// How much of the inline card must be on screen before it counts as seen.
const SEEN_THRESHOLD = 0.5;

export function DonateInline({ count, runKey, surface }: DonateInlineProps) {
  const s = useStyles();
  const cardRef = useRef<HTMLDivElement>(null);
  // Impression. The modal is seen the moment it opens, so it fires on mount.
  // The inline card sits below the downloads and, on a phone, below the fold,
  // so a render is not an impression: it fires once at least half the card has
  // entered the viewport. Browsers without IntersectionObserver fall back to
  // firing on mount rather than never.
  useEffect(() => {
    if (count === 0 || runKey === askShownForRun[surface]) return;
    const fire = () => {
      if (runKey === askShownForRun[surface]) return;
      askShownForRun[surface] = runKey;
      trackEvent('donation_ask_shown', { count: String(count), surface });
    };
    const el = cardRef.current;
    if (surface === 'modal' || !el || typeof IntersectionObserver === 'undefined') {
      fire();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        fire();
        observer.disconnect();
      }
    }, { threshold: SEEN_THRESHOLD });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, runKey, surface]);
  // null selected means "Other" is the active choice and the amount comes from
  // the custom input.
  const [selected, setSelected] = useState<number | null>(DEFAULT_AMOUNT);
  const [customValue, setCustomValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // The modal can open above the Done screen while the inline card is still in
  // the DOM, so the custom input id carries the surface.
  const customInputId = `donate-${surface}-custom-amount`;

  const isCustom = selected === null;
  const customAmount = parseInt(customValue, 10);
  // Custom amount must be a positive whole number of euros; an empty or invalid
  // entry leaves the Donate button inert.
  const customValid = !Number.isNaN(customAmount) && customAmount >= 1;
  const amount: number | null = isCustom ? (customValid ? customAmount : null) : selected;

  const launchCheckout = useCallback(async () => {
    if (pending || amount === null) return;
    // Open the destination tab synchronously inside the click handler, before
    // the async session call, so the browser does not treat it as a popup.
    const tab = window.open('about:blank', '_blank');
    setPending(true);
    setError('');
    try {
      const { sessionUrl, livemode } = await createDonationSession({
        amountCents: amount * 100,
        currency: 'EUR',
        successUrl: `${window.location.origin}/?donated=1`,
        cancelUrl: `${window.location.origin}/`,
      });
      // Same point and payload as DonationModal: after the session exists, in
      // whole euros, with Stripe's live/test flag.
      trackEvent('donation_initiated', { amount: String(amount), livemode, surface });
      // Navigate the pre-opened tab; if the popup was blocked (tab is null),
      // fall back to redirecting the current tab.
      if (tab) tab.location.href = sessionUrl;
      else window.location.href = sessionUrl;
    } catch {
      if (tab) tab.close();
      setError(t('donate.inline.error'));
    } finally {
      setPending(false);
    }
  }, [pending, amount, surface]);

  const choosePreset = useCallback((value: number) => {
    setSelected(value);
    setError('');
  }, []);

  const chooseOther = useCallback(() => {
    setSelected(null);
    setError('');
    // Move focus to the revealed input on the next frame, once it is mounted.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const ctaLabel = pending
    ? t('donate.inline.pending')
    : amount === null
      ? t('donate.inline.ctaBare')
      : t('donate.inline.cta', { amount: String(amount) });

  return (
    <div className={s.card} ref={cardRef}>
      <div className={s.heading}>{tCount(count, 'donate.inline.title')}</div>
      <div className={s.body}>{t('donate.inline.body')}</div>

      <div className={s.amounts} role="group" aria-label={t('donate.inline.chooseLbl')}>
        {PRESETS.map(({ amount: value, subKey }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              className={mergeClasses(s.chip, active && s.chipActive)}
              onClick={() => choosePreset(value)}
              disabled={pending}
              aria-pressed={active}
            >
              <span className={s.chipAmount}>{`${value} EUR`}</span>
              <span className={s.chipSub}>{t(subKey)}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={mergeClasses(s.chip, isCustom && s.chipActive)}
          onClick={chooseOther}
          disabled={pending}
          aria-pressed={isCustom}
          aria-expanded={isCustom}
          aria-controls={customInputId}
        >
          <span className={s.chipAmount}>{t('donate.inline.other')}</span>
          <span className={s.chipSub}>{t('donate.inline.otherSub')}</span>
        </button>
      </div>

      <div
        className={mergeClasses(s.customRegion, isCustom && s.customRegionOpen)}
        aria-hidden={!isCustom}
      >
        <div className={s.customRow}>
          <label htmlFor={customInputId} className={s.customLabel}>{t('donate.inline.customLbl')}</label>
          <input
            id={customInputId}
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className={s.customInput}
            value={customValue}
            disabled={pending}
            tabIndex={isCustom ? undefined : -1}
            onChange={(e) => {
              setCustomValue(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void launchCheckout();
            }}
          />
        </div>
      </div>

      <button
        type="button"
        className={s.cta}
        onClick={() => void launchCheckout()}
        disabled={pending || amount === null}
      >
        {ctaLabel}
      </button>

      <div className={s.micro}>{t('donate.inline.secure')}</div>

      <div className={s.error} role="status" aria-live="polite">
        {error}
      </div>
    </div>
  );
}
