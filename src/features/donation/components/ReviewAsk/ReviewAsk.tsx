import { useEffect, useRef } from 'react';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { useStyles } from './ReviewAsk.styles';

// Public G2 review form for Veidne. Opened in a new tab (same new-tab intent as
// DonateInline) so the user's generated files stay in the current tab.
const G2_REVIEW_URL = 'https://www.g2.com/products/veidne/review_modalities/new';
const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/veidne.com';

const FEEDBACK_MAILTO = 'mailto:info@veidne.com?subject=My%20Veidne%20review';

// How much of the ask must be on screen before it counts as seen.
const SEEN_THRESHOLD = 0.5;

// Identity of the generation run the impression was last sent for. Module
// level, not a ref, for the same reason as DonateInline: the Done screen can
// mount this more than once for one run.
let askShownForRun: object | null = null;

interface ReviewAskProps {
  condensed: boolean;
  /** Stable identity of the run (the generated files array); gates the
   *  review_ask_shown event to once per run. */
  runKey: object;
}

export function ReviewAsk({ condensed, runKey }: ReviewAskProps) {
  const s = useStyles();
  const ref = useRef<HTMLDivElement>(null);

  // Impression. The ask sits last on the page, below the donate card, so a
  // render is not an impression: the event fires once at least half of it has
  // entered the viewport, with the variant that was shown. Browsers without
  // IntersectionObserver fall back to firing on mount rather than never.
  useEffect(() => {
    if (runKey === askShownForRun) return;
    const fire = () => {
      if (runKey === askShownForRun) return;
      askShownForRun = runKey;
      trackEvent('review_ask_shown', { variant: condensed ? 'condensed' : 'full' });
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
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
  }, [condensed, runKey]);

  // Repeat visit: a single quiet one-line row, no card chrome.
  if (condensed) {
    return (
      <div className={s.condensedRow} ref={ref}>
        {t('review.ask.condensed')}{' '}
        <a
          className={s.condensedLink}
          href={G2_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('review_g2_clicked')}
        >
          {t('review.ask.cta')}
        </a>
      </div>
    );
  }

  // First time: the full calm card.
  return (
    <div className={s.card} ref={ref}>
      <div className={s.heading}>{t('review.ask.heading')}</div>
      <div className={s.body}>{t('review.ask.body')}</div>
      <a
        className={s.cta}
        href={G2_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('review_g2_clicked')}
      >
        {t('review.ask.cta')}
      </a>
      <a
        className={s.cta}
        href={TRUSTPILOT_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('review_trustpilot_clicked')}
      >
        {t('review.ask.ctaTrustpilot')}
      </a>
      <a
        className={s.line}
        href={FEEDBACK_MAILTO}
        onClick={() => trackEvent('review_line_clicked')}
      >
        {t('review.ask.line')}
      </a>
    </div>
  );
}
