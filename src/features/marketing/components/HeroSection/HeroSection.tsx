import { Link } from 'react-router-dom';
import { LockClosedRegular } from '@fluentui/react-icons';
import { useTranslation } from '@/i18n/useTranslation';
import { HeroCta } from '@/features/marketing/components/HeroCta';
import { useHeroSectionStyles } from './HeroSection.styles';

/**
 * Homepage hero, audit version (nov 2026).
 * Left: headline, what it does, the privacy promise with its one exception
 * (PDF), and the two calls to action. Right: a static example of template,
 * spreadsheet and resulting files. Nothing moves on its own (WCAG 2.2.2);
 * the finished example stays one click away.
 */
export function HeroSection() {
  const styles = useHeroSectionStyles();
  const { t } = useTranslation();

  return (
    <section className={styles.root}>
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

          <div className={styles.privacy}>
            <LockClosedRegular className={styles.privacyIcon} aria-hidden="true" />
            <p className={styles.privacyText}>
              <strong className={styles.privacyStrong}>{t('landing.hero.privacyStrong')}</strong>{' '}
              {t('landing.hero.privacyRest')}{' '}
              <a href="#where-your-data-goes" className={styles.privacyLink}>{t('landing.hero.privacyLink')}</a>
            </p>
          </div>

          <HeroCta showCount showNeeds />
        </div>

        <div className={styles.preview}>
          <div className={styles.glass}>
            <div className={styles.demoBar} aria-hidden="true">
              <span className={styles.demoDot} style={{ backgroundColor: 'rgba(255,111,111,.33)' }} />
              <span className={styles.demoDot} style={{ backgroundColor: 'rgba(255,209,111,.33)' }} />
              <span className={styles.demoDot} style={{ backgroundColor: 'rgba(134,224,168,.33)' }} />
            </div>
            <div className={styles.demoBody}>
              <div className={styles.demoDoc}>
                <div className={styles.sideLabel}>{t('landing.hero.example.label')}</div>
                <div className={styles.page}>
                  <div className={styles.pageTitle}>Certificate of completion</div>
                  <p className={styles.pageText}>
                    This certifies that <span className={styles.chip}>Name</span> completed{' '}
                    <span className={styles.chip}>Course</span> on <span className={styles.chip}>Date</span>.
                  </p>
                </div>
              </div>
              <div className={styles.side}>
                <div className={styles.sideLabel}>{t('landing.hero.example.list')}</div>
                <table className={styles.exTable}>
                  <thead>
                    <tr><th>Name</th><th>Course</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Anna Bērziņa</td><td>First aid</td><td>14.05.2026</td></tr>
                    <tr><td>Jānis Ozols</td><td>First aid</td><td>14.05.2026</td></tr>
                    <tr><td className={styles.exMore} colSpan={3}>+ 78 rows</td></tr>
                  </tbody>
                </table>
                <div className={styles.sideLabel} style={{ marginTop: 14 }}>{t('landing.hero.example.result')}</div>
                <div className={styles.files}>
                  <span className={styles.file}>Anna_Berzina.docx</span>
                  <span className={styles.file}>Janis_Ozols.docx</span>
                  <span className={styles.file}>+ 78 in one .zip</span>
                </div>
              </div>
            </div>
          </div>
          <Link to="/editor?flow=instant&src=hero_mockup" className={styles.previewCaption}>
            {t('landing.hero.mockupCaption')}
          </Link>
        </div>
      </div>
    </section>
  );
}
