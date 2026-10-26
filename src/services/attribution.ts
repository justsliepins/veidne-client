// First-touch traffic-source attribution, captured first-party only.
//
// Privacy: we keep ONLY the three UTM tags and the referrer's hostname. We never
// store the full referrer URL, its path, or its query string, and nothing that
// could identify a person. The capture is write-once per visitor (persisted in
// localStorage) so it reflects where the visitor first came from, letting later
// conversions be attributed to that first touch.

const KEY = 'veidne_first_touch';

export interface FirstTouchAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerHost?: string;
}

// Hostname only from document.referrer; same-host (internal) referrers are dropped.
function readReferrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).hostname;
    if (!host || host === window.location.hostname) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

function readUtms(): FirstTouchAttribution {
  const params = new URLSearchParams(window.location.search);
  const out: FirstTouchAttribution = {};
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  if (source) out.utmSource = source;
  if (medium) out.utmMedium = medium;
  if (campaign) out.utmCampaign = campaign;
  return out;
}

/**
 * Returns the visitor's first-touch attribution. On the very first call for a
 * visitor it captures UTMs + referrer hostname from the current page, persists
 * them, and reports `isFirstTouch: true`. On every later call it returns the
 * stored value with `isFirstTouch: false`.
 */
export function captureFirstTouchAttribution(): { attribution: FirstTouchAttribution; isFirstTouch: boolean } {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) {
      return { attribution: JSON.parse(stored) as FirstTouchAttribution, isFirstTouch: false };
    }
  } catch {
    // localStorage unavailable or corrupt value; fall through and capture fresh.
  }
  const attribution: FirstTouchAttribution = { ...readUtms() };
  const referrerHost = readReferrerHost();
  if (referrerHost) attribution.referrerHost = referrerHost;
  try {
    localStorage.setItem(KEY, JSON.stringify(attribution));
  } catch {
    // Best-effort; still report this capture as the first touch.
  }
  return { attribution, isFirstTouch: true };
}
