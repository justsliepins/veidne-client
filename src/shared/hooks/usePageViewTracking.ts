import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/services/analyticsService';
import { captureFirstTouchAttribution } from '@/services/attribution';

export function usePageViewTracking(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    // First-touch attribution rides along on a visitor's first page_view, so the
    // server can record it once and attribute later conversions back to it.
    const { attribution, isFirstTouch } = captureFirstTouchAttribution();
    trackEvent('page_view', isFirstTouch ? { path: pathname, attribution } : { path: pathname });
  }, [pathname]);
}
