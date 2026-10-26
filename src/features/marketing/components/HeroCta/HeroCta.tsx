import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/useTranslation';
import { fetchSocialProof } from '@/services/statsService';
import { useHeroCtaStyles } from './HeroCta.styles';

export interface HeroCtaProps {
  /**
   * Show the generated-documents counter under the buttons. It reads the live
   * /api/social-proof figure and is omitted entirely when no real count is
   * available (so it never appears in the static prerender).
   */
  showCount?: boolean;
}

/**
 * The homepage hero's two calls to action, "Start with your document" (primary)
 * and "Try the demo, no files required" (secondary), with the optional
 * generated-documents counter beneath them. Shared by HeroSection and the
 * use-case guide pages so the labels, destinations and styling stay identical.
 *
 * Renders a fragment: in the hero the row and the counter remain direct
 * children of the content column, which drives the staggered entrance.
 */
export function HeroCta({ showCount = false }: HeroCtaProps) {
  const styles = useHeroCtaStyles();
  const { t } = useTranslation();
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    if (!showCount) return;
    fetchSocialProof()
      .then((data) => setDocCount(data.count))
      .catch(() => {});
  }, [showCount]);

  return (
    <>
      <div className={styles.ctaRow}>
        <Link to="/editor?flow=template-data" className={styles.primaryCta}>
          {t('landing.hero.ctaPrimary')}
        </Link>
        <Link to="/editor?flow=exploring" className={styles.secondaryCta}>
          {t('landing.hero.ctaDemo')}
        </Link>
      </div>

      {/* One honest figure from the live /api/social-proof data, sitting just
          below the CTAs. Omitted entirely when no real count is available. */}
      {showCount && docCount > 0 && (
        <div className={styles.socialProof}>
          <span className={styles.socialProofText}>
            {t('landing.hero.socialProof.count', { count: docCount.toLocaleString() })}
          </span>
        </div>
      )}
    </>
  );
}
