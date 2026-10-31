import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/useTranslation';
import { features } from '@/config/features';
import { fetchSocialProof } from '@/services/statsService';
import { useTemplateStore } from '@/features/templates/store/templateStore';
import { useHeroCtaStyles } from './HeroCta.styles';

export interface HeroCtaProps {
  /**
   * Show the generated-documents counter under the buttons. It reads the live
   * /api/social-proof figure and is omitted entirely when no real count is
   * available (so it never appears in the static prerender). With the
   * expHomeOpenSource experiment on, the line also states the open-source fact.
   */
  showCount?: boolean;
  /**
   * Show the two lines under the buttons that say what is needed before
   * starting ("You need a Word document...", "No document yet?"). The homepage
   * shows them; the guide pages keep their existing text.
   */
  showNeeds?: boolean;
}

/**
 * The hero's two calls to action, "Open your Word document" (primary) and
 * "Try it with sample data" (secondary), the two lines that say what is
 * needed before starting, and the optional counter. Shared by HeroSection and
 * the use-case guide pages so the labels, destinations and styling stay
 * identical.
 *
 * Renders a fragment: in the hero these remain direct children of the content
 * column, which drives the staggered entrance.
 */
export function HeroCta({ showCount = false, showNeeds = false }: HeroCtaProps) {
  const styles = useHeroCtaStyles();
  const { t } = useTranslation();
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    if (!showCount) return;
    fetchSocialProof()
      .then((data) => setDocCount(data.count))
      .catch(() => {});
  }, [showCount]);

  const showOpenSource = showCount && features.expHomeOpenSource;

  return (
    <>
      <div className={styles.ctaRow}>
        {/* Plain /editor: a ?flow= parameter calls clearSession() and would delete
            a returning visitor's saved work; /editor shows the resume screen instead. */}
        <Link to="/editor" className={styles.primaryCta}>
          {t('landing.hero.ctaPrimary')}
        </Link>
        <Link to="/editor?flow=exploring" className={styles.secondaryCta}>
          {t('landing.hero.ctaDemo')}
        </Link>
      </div>

      {showNeeds && (
        <>
          <p className={styles.needs}>{t('landing.hero.needs')}</p>
          <p className={styles.needs}>
            {t('landing.hero.noDocStart')}{' '}
            <button type="button" className={styles.inlineBtn}
              onClick={() => useTemplateStore.getState().openLibrary()}>
              {t('landing.hero.noDocTemplates')}
            </button>{' '}
            {t('landing.hero.noDocOr')}
          </p>
        </>
      )}

      {/* One honest figure from the live /api/social-proof data. Omitted entirely
          when no real count is available, so it never appears in the prerender. */}
      {(showOpenSource || (showCount && docCount > 0)) && (
        <div className={styles.socialProof}>
          <span className={styles.socialProofText}>
            {showOpenSource && (
              <>
                {t('landing.hero.openSource')}{' '}
                <a className={styles.trustLink} href="https://github.com/justsliepins/veidne-client" target="_blank" rel="noopener noreferrer">
                  {t('landing.hero.openSourceLink')}
                </a>
              </>
            )}
            {showOpenSource && docCount > 0 && ' · '}
            {docCount > 0 && t('landing.hero.socialProof.count', { count: docCount.toLocaleString() })}
          </span>
        </div>
      )}
    </>
  );
}
