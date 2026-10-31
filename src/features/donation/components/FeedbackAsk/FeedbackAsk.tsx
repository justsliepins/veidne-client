import { useEffect, useRef, useState } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { trackEvent } from '@/services/analyticsService';
import { TRUSTPILOT_REVIEW_URL } from '@/config/constants';
import { useStyles } from './FeedbackAsk.styles';

// One question, one tap, asked after the files have been saved: "Did the
// documents come out right?" It replaces the two review asks the Done screen
// used to show (a line and a card with the same sentence).
//
// Trustpilot forbids inviting only people who had a good experience and
// pre-screening by sentiment, so the review link is on screen for everyone,
// before and after the answer, and never depends on it. The answer itself is
// for us: "Not quite" asks what went wrong, which is how silent wrong output
// (empty fields, dates in the wrong format) can surface at all.
//
// Server note: feedback_answered and feedback_reason must be added to the API
// analytics allowlist, or they are dropped like any unknown event.

const FEEDBACK_MAILTO = 'mailto:info@veidne.com?subject=Veidne%20feedback';
const REASONS = ['emptyFields', 'formats', 'layout', 'other'] as const;
type Reason = typeof REASONS[number];

// Once per run, as the other asks: module level because the Done screen can
// mount more than once for one run (the PDF consent step hides it and shows
// it again). The answer and the reasons are kept the same way, so the card
// does not ask again (review b, finding 25).
const shownForRun: { run: object | null } = { run: null };
type Answer = 'yes' | 'not_quite';
const answersByRun = new WeakMap<object, { answer: Answer | null; reasons: Reason[] }>();
function memoryFor(run: object) {
  let m = answersByRun.get(run);
  if (!m) { m = { answer: null, reasons: [] }; answersByRun.set(run, m); }
  return m;
}

interface FeedbackAskProps {
  runKey: object;
}

export function FeedbackAsk({ runKey }: FeedbackAskProps) {
  const s = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [answer, setAnswer] = useState<Answer | null>(() => memoryFor(runKey).answer);
  // Several reasons can be true at once (empty fields and wrong dates), so
  // each is its own toggle and each pressed one shows its help, in the order
  // pressed (review a, finding 22).
  const [reasons, setReasons] = useState<Reason[]>(() => memoryFor(runKey).reasons);
  const focusHeading = useRef(false);

  useEffect(() => {
    if (shownForRun.run === runKey) return;
    const fire = () => {
      if (shownForRun.run === runKey) return;
      shownForRun.run = runKey;
      trackEvent('review_ask_shown', { variant: 'feedback' });
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { fire(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { fire(); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [runKey]);

  // The pressed "Yes" or "Not quite" is replaced by the answer, so focus moves
  // to the heading that now holds it (WCAG 2.4.3).
  useEffect(() => {
    if (answer !== null && focusHeading.current) { focusHeading.current = false; headingRef.current?.focus(); }
  }, [answer]);

  const choose = (a: Answer) => {
    focusHeading.current = true;
    memoryFor(runKey).answer = a;
    setAnswer(a);
    trackEvent('feedback_answered', { answer: a });
  };
  const toggleReason = (r: Reason) => {
    const on = !reasons.includes(r);
    const next = on ? [...reasons, r] : reasons.filter((x) => x !== r);
    memoryFor(runKey).reasons = next;
    setReasons(next);
    if (on) trackEvent('feedback_reason', { reason: r });
  };

  return (
    <section className={s.card} ref={ref} aria-labelledby="feedback-ask-q">
      <div className={answer === null ? s.row : undefined}>
        <h2 id="feedback-ask-q" ref={headingRef} tabIndex={-1} className={s.question}>
          {answer === null ? t('feedback.q') : answer === 'yes' ? t('feedback.thanksYes') : t('feedback.thanksNo')}
        </h2>
        {answer === null && (
          <div className={s.choices}>
            <button type="button" className={s.choice} onClick={() => choose('yes')}>{t('feedback.yes')}</button>
            <button type="button" className={s.choice} onClick={() => choose('not_quite')}>{t('feedback.notQuite')}</button>
          </div>
        )}
      </div>
      {answer === 'not_quite' && (
        <>
          <div className={s.reasons} role="group" aria-label={t('feedback.whatWrong')}>
            {REASONS.map((r) => (
              <button key={r} type="button" aria-pressed={reasons.includes(r)}
                className={mergeClasses(s.reason, reasons.includes(r) && s.reasonOn)} onClick={() => toggleReason(r)}>
                {t(`feedback.reason.${r}`)}
              </button>
            ))}
          </div>
          {/* Present (empty) as soon as the reasons are, so each help text is read when it appears. */}
          <div aria-live="polite">
            {reasons.map((r) => <p key={r} className={s.help}>{t(`feedback.help.${r}`)}</p>)}
            {reasons.length > 0 && (
              <p className={s.help}>
                <a className={s.link} href={FEEDBACK_MAILTO} onClick={() => trackEvent('review_line_clicked', { source: 'feedback' })}>
                  {t('feedback.write')}
                </a>
              </p>
            )}
          </div>
        </>
      )}
      {/* Same words and the same link whatever the answer, or with no answer. */}
      <p className={s.review}>
        {t('review.ask.condensed')}{' '}
        <a className={s.link} href={TRUSTPILOT_REVIEW_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => trackEvent('review_trustpilot_clicked', { source: 'feedback', answer: answer ?? 'none' })}>
          {t('review.ask.condensedCta')}
        </a>
      </p>
    </section>
  );
}
