import { API_BASE_URL } from '@/config/constants';

export type AnalyticsEvent =
  | 'page_view'
  | 'matrix_selection'
  | 'document_uploaded'
  | 'placeholder_created'
  | 'excel_uploaded'
  | 'generate_started'
  | 'generate_completed'
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
  | 'review_ask_shown';

export function trackEvent(event: AnalyticsEvent, data?: Record<string, unknown>): void {
  fetch(`${API_BASE_URL}/analytics`, {
    method: 'POST',
    // The API derives UserId from the veidne_uid cookie. The API is served
    // same-origin under /api today, so the cookie goes along regardless; this
    // keeps it that way if the API ever moves to another origin.
    credentials: 'include',
    // Survive a same-tab navigation that starts right after the call (the
    // popup-blocked fallback of the donate card, the About page modal).
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  }).catch(() => {});
}
