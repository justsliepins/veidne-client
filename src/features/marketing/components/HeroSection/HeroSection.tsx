import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mergeClasses } from '@fluentui/react-components';
import { useTranslation } from '@/i18n/useTranslation';
import { HeroCta } from '@/features/marketing/components/HeroCta';
import { useHeroSectionStyles } from './HeroSection.styles';

// Reveal order in the demo: 0=Name, 1=Date, 2=Location, then 4=Generate activates.
const STEP_COUNT = 5;
const STEP_DELAYS = [700, 850, 850, 850, 2900]; // ms each step is shown before advancing

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroSection() {
  const styles = useHeroSectionStyles();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openInstantPreview = () => navigate('/editor?flow=instant&src=hero_mockup');

  // Calm auto-playing demo loop. Reduced motion: jump to the fully populated state.
  const [reduce] = useState(prefersReducedMotion);
  const [step, setStep] = useState(reduce ? STEP_COUNT - 1 : 0);

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setStep(i);
      const d = STEP_DELAYS[i];
      i = (i + 1) % STEP_COUNT;
      timer = setTimeout(run, d);
    };
    run();
    return () => clearTimeout(timer);
  }, [reduce]);

  // chip/field index i is revealed once step has passed it (step > i).
  const chip = (label: string, i: number) => (
    <span className={mergeClasses(styles.chip, step <= i && styles.chipHidden)}>{label}</span>
  );
  const fieldRow = (label: string, i: number) => (
    <div className={mergeClasses(styles.field, step <= i && styles.fieldHidden)}>
      <span className={styles.fieldDot} />{label}
    </div>
  );
  const fieldsCount = Math.max(0, Math.min(step, 3));
  const genActive = step >= 4;

  return (
    <section className={styles.root}>
      {/* Pure-CSS aurora, decorative, reduced-motion aware. */}
      <div className={styles.aurora} aria-hidden="true">
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
        <div className={`${styles.blob} ${styles.blob4}`} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.content}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            {t('landing.hero.badge')}
          </span>

          <h1 className={styles.headline}>
            {t('landing.hero.titleStart')}
            <span className={styles.headlineAccent}>{t('landing.hero.titleAccent')}</span>
            {t('landing.hero.titleEnd')}
          </h1>

          <p className={styles.subtitle}>{t('landing.hero.subtitle')}</p>

          {/* The two CTAs and the generated-documents counter (shared with the
              use-case guides via HeroCta). */}
          <HeroCta showCount />

        </div>

        {/* Auto-playing demonstration of the flow; the card itself opens the
            instant preview of the same sample document. */}
        <div className={styles.preview}>
          <div
            role="button"
            tabIndex={0}
            aria-label={t('landing.hero.mockupAria')}
            className={styles.mockupButton}
            onClick={openInstantPreview}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openInstantPreview();
              }
            }}
          >
            <div className={styles.glass} aria-hidden="true">
              <div className={styles.demoBar}>
                <span className={styles.demoDot} style={{ backgroundColor: 'rgba(255,111,111,.33)' }} />
                <span className={styles.demoDot} style={{ backgroundColor: 'rgba(255,209,111,.33)' }} />
                <span className={styles.demoDot} style={{ backgroundColor: 'rgba(134,224,168,.33)' }} />
              </div>
              <div className={styles.demoBody}>
                <div className={styles.demoDoc}>
                  <div className={styles.page}>
                    <div className={styles.pageTitle}>Invitation Letter</div>
                    <p className={styles.pageText}>
                      Dear {chip('Name', 0)},
                      <br /><br />
                      {"You're invited to our Annual Team Gathering!"}
                      <br />
                      Date: {chip('Date', 1)}
                      <br />
                      Location: {chip('Location', 2)}
                      <br /><br />
                      {"We'd love to see you there, "}{chip('Name', 0)}.
                    </p>
                  </div>
                </div>
                <div className={styles.side}>
                  <div className={styles.sideLabel}>{fieldsCount > 0 ? `Fields, ${fieldsCount}` : 'Fields'}</div>
                  {fieldRow('Name', 0)}
                  {fieldRow('Date', 1)}
                  {fieldRow('Location', 2)}
                  <div className={mergeClasses(styles.generateBtn, !genActive && styles.genInactive)}>
                    Generate 24
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.previewCaption}>{t('landing.hero.mockupCaption')}</p>
        </div>
      </div>
    </section>
  );
}
