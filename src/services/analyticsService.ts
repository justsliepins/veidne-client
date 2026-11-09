import { API_BASE_URL } from '@/config/constants';
import { consentHeader } from '@/features/consent/consentStore';

export type AnalyticsEvent =
  | 'page_view'
  | 'matrix_selection'
  | 'document_uploaded'
  | 'placeholder_created'
  | 'template_fields_imported'
  | 'excel_uploaded'
  | 'generate_started'
  | 'generate_completed'
  | 'generate_failed'
  | 'template_downloaded'
  | 'template_selected'
  | 'kit_downloaded'
  | 'donation_initiated'
  | 'suggestion_submitted'
  | 'roadmap_voted'
  | 'demo_started'
  | 'instant_preview_opened'
  | 'instant_preview_swapped'
  | 'image_field_created'
  | 'images_added'
  | 'image_match'
  | 'session_restored'
  | 'bug_report_submitted'
  | 'pdf_started'
  | 'pdf_generated'
  | 'review_g2_clicked'
  | 'review_trustpilot_clicked'
  | 'review_line_clicked'
  | 'download_modal_shown'
  | 'donation_ask_shown'
  | 'review_ask_shown'
  | 'feedback_answered'
  | 'feedback_reason'
  | 'donation_ask_dismissed'
  | 'start_over'
  | 'consent_choice';

export function trackEvent(event: AnalyticsEvent, data?: Record<string, unknown>, options?: { anonymous?: boolean }): void {
  // The statistics cookie only with consent (work package 14). The header
  // tells the API what the visitor chose: "statistics" lets it read or set
  // veidne_uid, "none" makes it remove an old one, and no header means no
  // choice yet. Without consent no cookie is sent and the event is recorded
  // without an identifier. `anonymous` sends one event without either, even
  // after consent (the consent choice itself is recorded that way).
  const consent = options?.anonymous ? null : consentHeader();
  fetch(`${API_BASE_URL}/analytics`, {
    method: 'POST',
    credentials: consent === null ? 'omit' : 'include',
    // Survive a same-tab navigation that starts right after the call (the
    // popup-blocked fallback of the donate card, the About page modal).
    keepalive: true,
    // Same-origin requests would otherwise carry the full page address, query
    // string included, in the Referer header (for example the thank-you
    // page's payment reference). The page's path is in the body already.
    referrerPolicy: 'no-referrer',
    headers: consent === null ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', 'X-Veidne-Consent': consent },
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  }).catch(() => {});
}
