export const veidneTokens = {
  colors: {
    brandOrange: '#F9A825',
    fieldHighlight: '#FFFDE7',
    placeholderBg: 'rgba(85, 102, 196, 0.15)',
    placeholderUnmappedBg: 'rgba(249, 168, 37, 0.15)',
    successGreen: '#15803D',
    error: '#EF4444',
    pendingGray: '#5E5560',
    pendingCircle: '#E8E8F0',
    wordHoverBg: 'rgba(85, 102, 196, 0.04)',
    wordHoverUnderline: '#C8C8D0',
    wordSelected: 'rgba(85, 102, 196, 0.15)',
    wordRangePreview: 'rgba(85, 102, 196, 0.08)',
    filledValueUnderline: 'currentColor',
    previewHighlight: 'rgba(85, 102, 196, 0.15)',
    rowIndicatorBg: 'rgba(85, 102, 196, 0.08)',
    rowIndicatorText: '#46529E',
    badgeBg: 'rgba(255, 255, 255, 0.2)',
  },
  breakpoints: {
    sm: '640px',   // Small mobile landscape
    md: '768px',   // Tablet portrait
    lg: '1024px',  // Tablet landscape / small laptop
    xl: '1280px',  // Desktop
  },
  layout: {
    navHeight: '94px',
    navVerticalPadding: '20px',
    navHorizontalPadding: '48px',
    completionBarHeight: '86px',
    completionBarCompactHeight: '54px',
    sidebarWidth: '280px',
    documentPaperMaxWidth: '1000px',
    previewPanelWidth: '380px',
    maxContentWidth: '1440px',
  },
  layoutMobile: {
    navHeight: '56px',
    navHorizontalPadding: '16px',
    completionBarHeight: '48px',
    sidebarWidth: '100%',    // full-width overlay on mobile
    sectionPadding: '40px 16px',
  },
  shadows: {
    card: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    cardLight: '0px 1px 4px rgba(0, 0, 0, 0.04)',
    cardElevated: '0px 4px 24px rgba(0, 0, 0, 0.08)',
    modal: '0px 8px 32px rgba(0, 0, 0, 0.16)',
  },
  // Single source of truth for stacking order. Lower sits behind higher.
  // base content < sticky nav < docked FIELDS bar < full-screen editor panel
  // < first-run nudge < modal/sheet backdrop < modal/sheet < image lightbox
  // < toast (always on top). The nudge lives below the backdrop so an open
  // modal dims and covers it.
  zIndex: {
    base: 1,
    nav: 100,
    dockedBar: 200,
    nudge: 250,
    panel: 500,
    backdrop: 800,
    modal: 900,
    lightbox: 1000,
    toast: 1100,
  },
} as const;

export const veidneTypography = {
  h1: { fontSize: '48px', lineHeight: '56px', fontWeight: 600 as const },
  h2: { fontSize: '32px', lineHeight: '40px', fontWeight: 600 as const },
  h3: { fontSize: '24px', lineHeight: '32px', fontWeight: 600 as const },
  bodyLarge: { fontSize: '18px', lineHeight: '28px', fontWeight: 400 as const },
  bodyRegular: { fontSize: '15px', lineHeight: '24px', fontWeight: 400 as const },
  bodySmall: { fontSize: '13px', lineHeight: '20px', fontWeight: 400 as const },
  labelButton: { fontSize: '14px', lineHeight: '20px', fontWeight: 600 as const },
} as const;
