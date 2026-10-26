import { HeroCta } from '@/features/marketing/components/HeroCta';
import { useUseCaseGuideStyles } from './UseCaseGuide.styles';

export interface UseCaseFaq {
  q: string;
  a: string;
}

export interface UseCaseExtra {
  lead: string;
  text: string;
}

export interface UseCaseGuideProps {
  /** The visible page heading (H1). */
  h1: string;
  /** Human-readable freshness line, e.g. "June 2026". */
  lastUpdated: string;
  /** The self-contained, answer-first opening paragraph. */
  answer: string;
  whatItIs: string;
  whoItIsFor: string;
  free: string;
  isPrivate: string;
  /** Ordered "How it works" steps. */
  steps: string[];
  /** Extra body paragraphs (e.g. PDF export note) rendered after the steps. */
  extras?: UseCaseExtra[];
  faq: UseCaseFaq[];
}

/**
 * Presentational, answer-first layout shared by the use-case guide pages.
 * Renders in the order: H1, Last updated, answer, the homepage hero's two
 * calls to action with the generated-documents counter, the
 * what/who/free/private block, the how-it-works steps, optional extra
 * paragraphs, the FAQ, then the same two calls to action again. The copy is
 * passed in as plain strings so it is present in the DOM at prerender time
 * (no i18n, no async loading).
 */
export function UseCaseGuide({
  h1,
  lastUpdated,
  answer,
  whatItIs,
  whoItIsFor,
  free,
  isPrivate,
  steps,
  extras,
  faq,
}: UseCaseGuideProps) {
  const styles = useUseCaseGuideStyles();

  return (
    <article className={styles.root}>
      <h1 className={styles.title}>{h1}</h1>
      <p className={styles.lastUpdated}>Last updated: {lastUpdated}</p>
      <p className={styles.answer}>{answer}</p>

      <div className={styles.ctaBlock}>
        <HeroCta showCount />
      </div>

      <div className={styles.infoBlock}>
        <p className={styles.infoRow}><span className={styles.infoLabel}>What it is:</span> {whatItIs}</p>
        <p className={styles.infoRow}><span className={styles.infoLabel}>Who it is for:</span> {whoItIsFor}</p>
        <p className={styles.infoRow}><span className={styles.infoLabel}>Free:</span> {free}</p>
        <p className={styles.infoRow}><span className={styles.infoLabel}>Private:</span> {isPrivate}</p>
      </div>

      <h2 className={styles.sectionHeading}>How it works</h2>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={i} className={styles.step}>{step}</li>
        ))}
      </ol>

      {extras?.map((extra, i) => (
        <p key={i} className={styles.extraPara}>
          <span className={styles.extraLead}>{extra.lead}:</span> {extra.text}
        </p>
      ))}

      <h2 className={styles.sectionHeading}>FAQ</h2>
      <div className={styles.faqList}>
        {faq.map((item, i) => (
          <div key={i} className={styles.faqItem}>
            <p className={styles.faqQuestion}>{item.q}</p>
            <p className={styles.faqAnswer}>{item.a}</p>
          </div>
        ))}
      </div>

      <div className={styles.ctaBlock}>
        <HeroCta />
      </div>
    </article>
  );
}
