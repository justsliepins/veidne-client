import { makeStyles } from '@fluentui/react-components';

// Brandbook colors, the same literals the hero uses so the buttons match it.
const INK = '#1A1622';
const MUTED = '#5E5560';
const PERI = '#5566C4'; // action fill / accent
const PERI_DEEP = '#46529E'; // hover + AA text/links
const LINE_STRONG = 'rgba(26,22,34,.14)';

// The homepage hero's call-to-action pair and its generated-documents counter,
// lifted out of HeroSection.styles so the use-case guides render the identical
// buttons (same labels, destinations, sizing and breakpoints).
export const useHeroCtaStyles = makeStyles({
  ctaRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    // Narrow phones: the two CTAs stack vertically at full width, primary on top.
    '@media (max-width: 559px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    },
  },

  // Primary action: the single reserved periwinkle fill.
  primaryCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    padding: '14px 24px',
    borderRadius: '11px',
    backgroundColor: PERI,
    color: '#FFFFFF',
    textDecorationLine: 'none',
    boxShadow: '0 10px 22px -9px rgba(85,102,196,.6)',
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '0.15s, 0.2s',
    ':hover': { backgroundColor: PERI_DEEP, transform: 'translateY(-1px)' },
    ':focus-visible': { outline: `2px solid ${PERI}`, outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': {
      transitionProperty: 'none',
      ':hover': { transform: 'none' },
    },
    '@media (min-width: 1024px) and (max-width: 1279px)': { padding: '13px 18px' },
    '@media (max-width: 559px)': { width: '100%' },
  },

  // Secondary action: neutral ghost.
  secondaryCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    padding: '13px 22px',
    borderRadius: '11px',
    backgroundColor: 'rgba(255,255,255,.55)',
    color: INK,
    border: `1.5px solid ${LINE_STRONG}`,
    textDecorationLine: 'none',
    cursor: 'pointer',
    transitionProperty: 'border-color, color',
    transitionDuration: '0.2s',
    ':hover': { border: `1.5px solid ${INK}` },
    ':focus-visible': { outline: `2px solid ${PERI}`, outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    '@media (min-width: 1024px) and (max-width: 1279px)': { padding: '12px 16px' },
    '@media (max-width: 559px)': { width: '100%' },
  },

  socialProof: { display: 'flex', alignItems: 'center', gap: '9px' },
  socialProofText: { fontSize: '13.5px', fontWeight: 500, color: MUTED },
});
