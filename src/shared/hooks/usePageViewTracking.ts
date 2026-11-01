import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/services/analyticsService';
import { arrivalAttribution, captureFirstTouchAttribution } from '@/services/attribution';
import { statisticsAllowed } from '@/features/consent/consentStore';

export function usePageViewTracking(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    // First-touch attribution rides along on a visitor's first page_view, so the
    // server can record it once and attribute later conversions back to it.
    // Only with consent is it kept in this browser (work package 14);
    // without it, the page a visitor arrives on reports where they came from.
    if (statisticsAllowed()) {
      const { attribution, isFirstTouch } = captureFirstTouchAttribution();
      trackEvent('page_view', isFirstTouch ? { path: pathname, attribution } : { path: pathname });
      return;
    }
    const arrival = arrivalAttribution();
    trackEvent('page_view', arrival ? { path: pathname, attribution: arrival } : { path: pathname });
  }, [pathname]);
}
