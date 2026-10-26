import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/shared/components/PageLayout';
import { PageSeo } from '@/shared/components/PageSeo';
import { useTranslation } from '@/i18n/useTranslation';
import { trackEvent } from '@/services/analyticsService';
import { getDonationSession, type DonationSession } from '@/services/donationService';
import { submitSuggestion } from '@/services/suggestionService';
import { useThankYouStyles } from './ThankYou.styles';
import { useEditorStore } from '@/features/editor/store/editorStore';
import { useDataStore } from '@/features/data/store/dataStore';
import { useGeneratorStore } from '@/features/generator/store/generatorStore';

// Stripe redirects here right after payment. The webhook that marks the row
// Completed can lag that redirect by seconds, so while the row is Pending the
// page re-reads it on this cadence, for about a minute in total.
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

// SuggestionService wants a title (1-200) and a description (1-2000). The page
// offers a single box, so the first line stands in as the title.
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

function formatAmount(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function resetWorkspace(): void {
  useEditorStore.getState().reset();
  useDataStore.getState().reset();
  useGeneratorStore.getState().reset();
}

export function ThankYou() {
  const s = useThankYouStyles();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState<DonationSession | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getDonationSession(sessionId)
      .then((data) => { if (!cancelled) setSession(data); })
      .catch(() => { /* lookup failed: the thanks still render, without the amount */ });
    return () => { cancelled = true; };
  }, [sessionId, attempts]);

  useEffect(() => {
    if (!sessionId || session?.status !== 'Pending' || attempts >= POLL_MAX_ATTEMPTS) return;
    const id = setTimeout(() => setAttempts((n) => n + 1), POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [sessionId, session, attempts]);

  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!sessionId) return;
    const text = suggestion.trim();
    if (!text) return;
    const title = (text.split('\n').find((line) => line.trim()) ?? text).trim().slice(0, TITLE_MAX);
    setError(''); setSubmitting(true);
    try {
      await submitSuggestion({ title, description: text.slice(0, DESCRIPTION_MAX), stripeSessionId: sessionId });
      trackEvent('suggestion_submitted');
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suggestion.modal.error'));
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, suggestion, t]);

  const amount = session ? formatAmount(session.amountCents) : null;
  const canSuggest = session?.status === 'Completed';

  return (
    <PageLayout navVariant="light">
      <PageSeo title={t('meta.thankyou.title')} path="/thank-you" noindex />
      <div className={s.root}>
        <h1 className={s.title}>{t('thankyou.title')}</h1>
        {amount !== null && <p className={s.body}>{t('thankyou.body', { amount })}</p>}
        <p className={s.receipt}>{t('thankyou.receipt')}</p>

        {canSuggest && (
          <section className={s.card} aria-labelledby="thankyou-suggest-title">
            <h2 id="thankyou-suggest-title" className={s.cardTitle}>{t('thankyou.suggestTitle')}</h2>
            <p className={s.cardBody}>{t('thankyou.suggestBody')}</p>
            {submitted ? (
              <p className={s.success}>{t('suggestion.modal.success')}</p>
            ) : (
              <>
                <div>
                  <label htmlFor="thankyou-suggestion" className={s.label}>{t('thankyou.suggestLabel')}</label>
                  <textarea id="thankyou-suggestion" className={s.textarea} value={suggestion}
                    maxLength={DESCRIPTION_MAX} disabled={submitting}
                    onChange={(e) => { setSuggestion(e.target.value); setError(''); }} />
                </div>
                <button type="button" className={s.cta} disabled={submitting || suggestion.trim().length === 0}
                  onClick={() => void handleSubmit()}>
                  {t('suggestion.modal.submit')}
                </button>
                {error && <p className={s.error}>{error}</p>}
              </>
            )}
          </section>
        )}

        <div className={s.onward}>
          <p className={s.otherTab}>{t('thankyou.otherTab')}</p>
          {/* A fresh merge: the stores are reset first so the upload step
              never shows the previous run (the popup-blocked fallback lands
              here in the same tab). A saved, unfinished project still gets
              its resume screen. */}
          <Link to="/editor" className={s.another} onClick={resetWorkspace}>{t('thankyou.another')}</Link>
        </div>
      </div>
    </PageLayout>
  );
}
