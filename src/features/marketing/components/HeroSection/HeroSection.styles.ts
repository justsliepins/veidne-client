import { makeStyles } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

// Brandbook colors (literals so the hero hits the exact visual target).
const INK = '#1A1622';
const MUTED = '#5E5560';
const FAINT = '#767077';
const PERI = '#5566C4'; // action fill / accent
const PERI_SOFT = 'rgba(85,102,196,.14)'; // soft tint (product chips)
const PERI_TEXT = '#46529E';
const N_SOFT = 'rgba(26,22,34,.05)';
const N_BORDER = 'rgba(26,22,34,.1)';
const SUCCESS = '#3EC98A';

// Four independent slow aurora drifts (transform only). Each blob gets its own
// path, duration and negative delay so the gradient field shifts organically
// instead of pulsing in unison. Calm by design — noticeable only if watched.
const drift1 = {
  '0%': { transform: 'translate(0,0) scale(1)' },
  '33%': { transform: 'translate(48px,30px) scale(1.08)' },
  '66%': { transform: 'translate(-34px,24px) scale(.94)' },
  '100%': { transform: 'translate(0,0) scale(1)' },
};
const drift2 = {
  '0%': { transform: 'translate(0,0) scale(1)' },
  '33%': { transform: 'translate(-44px,36px) scale(1.10)' },
  '66%': { transform: 'translate(40px,-28px) scale(.93)' },
  '100%': { transform: 'translate(0,0) scale(1)' },
};
const drift3 = {
  '0%': { transform: 'translate(0,0) scale(1)' },
  '33%': { transform: 'translate(38px,-32px) scale(.95)' },
  '66%': { transform: 'translate(-50px,20px) scale(1.07)' },
  '100%': { transform: 'translate(0,0) scale(1)' },
};
const drift4 = {
  '0%': { transform: 'translate(0,0) scale(1)' },
  '33%': { transform: 'translate(-52px,-26px) scale(1.09)' },
  '66%': { transform: 'translate(46px,32px) scale(.92)' },
  '100%': { transform: 'translate(0,0) scale(1)' },
};

// Short staggered entrance fade-up, once on load.
const fadeUp = {
  from: { opacity: 0, transform: 'translateY(14px)' },
  to: { opacity: 1, transform: 'none' },
};

export const useHeroSectionStyles = makeStyles({
  root: {
    position: 'relative',
    overflow: 'hidden',
  },

  // Centered max-width grid: balanced two columns, vertically centered,
  // sized to fit content with comfortable padding (no fixed height).
  wrap: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1180px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
    gap: '48px',
    alignItems: 'center',
    padding: '72px 48px',
    // 1024 to 1279: widen the text column so the two CTAs keep to one row.
    '@media (min-width: 1024px) and (max-width: 1279px)': {
      gridTemplateColumns: 'minmax(0, 1.12fr) minmax(0, 0.88fr)',
      gap: '36px',
    },
    // Stacked below lg: between 768 and 1023 the two-column layout pins the
    // demo card against the text, so the card moves below the headline block.
    [media.below.lg]: { gridTemplateColumns: '1fr', padding: '56px 24px', gap: '48px' },
    [media.below.md]: { gap: '56px', padding: '48px 24px' },
    [media.below.sm]: { padding: '36px 16px 48px', gap: '48px' },
  },

  // Pure-CSS aurora: base radial gradient + four blurred multiply blobs.
  aurora: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'radial-gradient(120% 90% at 78% 0%, #F1EFFF 0%, #FBFBFE 60%)',
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(76px)',
    opacity: 0.55,
    mixBlendMode: 'multiply',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    // Freeze entirely for anyone who asks for reduced motion.
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    // Mobile: lighter blur radius so the GPU does less work per frame.
    [media.below.md]: { filter: 'blur(54px)' },
  },
  // Each blob pauses its drift on small screens (animationName none), leaving a
  // calm static gradient field; the per-blob reduced-motion freeze still applies.
  blob1: { width: '470px', height: '470px', backgroundColor: '#9AA6F4', top: '-130px', left: '-60px',
    animationName: drift1, animationDuration: '19s', animationDelay: '-3s',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    [media.below.md]: { animationName: 'none' } },
  blob2: { width: '430px', height: '430px', backgroundColor: '#86D8EC', top: '-90px', right: '5%',
    animationName: drift2, animationDuration: '23s', animationDelay: '-9s',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    [media.below.md]: { animationName: 'none' } },
  blob3: { width: '400px', height: '400px', backgroundColor: '#F4C4D6', bottom: '-150px', right: '20%',
    animationName: drift3, animationDuration: '17s', animationDelay: '-14s',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    [media.below.md]: { animationName: 'none' } },
  blob4: { width: '330px', height: '330px', backgroundColor: '#C3B8F5', bottom: '-120px', left: '12%',
    animationName: drift4, animationDuration: '21s', animationDelay: '-6s',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    [media.below.md]: { animationName: 'none' } },

  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '22px',
    maxWidth: 'none',
    minWidth: 0,
    [media.below.md]: { maxWidth: '100%' },
    '& > *': {
      opacity: 0,
      transform: 'translateY(14px)',
      animationName: fadeUp,
      animationDuration: '0.7s',
      animationTimingFunction: 'cubic-bezier(.2,.7,.3,1)',
      animationFillMode: 'forwards',
    },
    '& > *:nth-child(1)': { animationDelay: '0.05s' },
    '& > *:nth-child(2)': { animationDelay: '0.15s' },
    '& > *:nth-child(3)': { animationDelay: '0.25s' },
    '& > *:nth-child(4)': { animationDelay: '0.35s' },
    '& > *:nth-child(5)': { animationDelay: '0.45s' },
    '& > *:nth-child(6)': { animationDelay: '0.55s' },
    // Reduced motion: show the final state immediately, no entrance.
    '@media (prefers-reduced-motion: reduce)': {
      '& > *': { opacity: 1, transform: 'none', animationName: 'none' },
    },
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '6px 13px',
    backgroundColor: N_SOFT,
    border: `1px solid ${N_BORDER}`,
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 500,
    color: MUTED,
    width: 'fit-content',
  },
  badgeDot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: SUCCESS, flexShrink: 0 },

  headline: {
    margin: 0,
    fontSize: 'clamp(2rem, 3.6vw, 2.8125rem)', // 32px → 45px
    lineHeight: 1.08,
    letterSpacing: '-0.025em',
    fontWeight: 600,
    color: INK,
    maxWidth: '22ch',
    [media.below.sm]: { maxWidth: '100%' },
  },
  headlineAccent: { color: PERI_TEXT },

  subtitle: {
    margin: 0,
    fontSize: '17px',
    lineHeight: 1.55,
    color: MUTED,
    maxWidth: '34ch',
  },

  // The CTA row, the two buttons and the counter live in HeroCta.styles.

  // Right-side auto-playing preview; the card doubles as the instant preview
  // entry, with its caption sitting just below.
  preview: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  // Clickable wrapper around the card: pointer, slight hover lift, visible
  // keyboard focus. The decorative card inside stays untouched.
  mockupButton: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '18px',
    transitionProperty: 'transform',
    transitionDuration: '0.18s',
    transitionTimingFunction: 'cubic-bezier(.2,.7,.3,1)',
    ':hover': { transform: 'translateY(-3px)' },
    ':focus-visible': { outline: `2px solid ${PERI}`, outlineOffset: '4px' },
    '@media (prefers-reduced-motion: reduce)': {
      transitionProperty: 'none',
      ':hover': { transform: 'none' },
    },
  },
  previewCaption: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 500,
    color: MUTED,
    textAlign: 'center',
  },
  glass: {
    width: '100%',
    maxWidth: 'none',
    borderRadius: '18px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.5)',
    backdropFilter: 'blur(22px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
    border: '1px solid rgba(255,255,255,.82)',
    boxShadow: '0 30px 70px -28px rgba(70,55,75,.4)',
    // Stacked layouts: cap the card width so it reads as a card, not a banner.
    [media.below.lg]: { maxWidth: '540px' },
    // Mobile: drop the live backdrop blur (expensive while scrolling) and lean on
    // a near-opaque fill instead, so the card stays crisp and scroll stays smooth.
    [media.below.md]: {
      maxWidth: '540px',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      backgroundColor: 'rgba(255,255,255,.9)',
    },
  },
  demoBar: {
    display: 'flex',
    gap: '6px',
    padding: '11px 14px',
    borderBottom: '1px solid rgba(255,255,255,.5)',
  },
  demoDot: { width: '11px', height: '11px', borderRadius: '50%' },
  demoBody: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    [media.below.sm]: { gridTemplateColumns: '1fr' },
  },
  demoDoc: { padding: '16px', borderRight: '1px solid rgba(255,255,255,.5)' },
  page: {
    position: 'relative',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,.74)',
    padding: '16px 16px 18px',
    boxShadow: '0 8px 20px -12px rgba(70,55,75,.34)',
  },
  pageTitle: { fontSize: '13.5px', fontWeight: 600, color: INK, marginBottom: '11px' },
  pageText: { fontSize: '12px', color: MUTED, lineHeight: 1.95 },
  chip: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 600,
    padding: '1px 7px',
    borderRadius: '6px',
    backgroundColor: PERI_SOFT,
    color: PERI_TEXT,
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.45s',
    transitionTimingFunction: 'cubic-bezier(.2,.7,.3,1)',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Reveal state: chip occupies its slot but is invisible until its step.
  chipHidden: { opacity: 0, transform: 'scale(.82)' },
  side: { padding: '16px 15px', backgroundColor: 'rgba(255,255,255,.28)' },
  sideLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: FAINT,
    marginBottom: '12px',
  },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: INK,
    marginBottom: '13px',
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.45s',
    transitionTimingFunction: 'cubic-bezier(.2,.7,.3,1)',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Reveal state: row keeps its space so the list height stays stable.
  fieldHidden: { opacity: 0, transform: 'translateY(5px)' },
  fieldDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PERI, flexShrink: 0 },
  generateBtn: {
    marginTop: '6px',
    width: '100%',
    backgroundColor: PERI,
    color: '#FFFFFF',
    borderRadius: '9px',
    padding: '9px',
    fontSize: '12.5px',
    fontWeight: 600,
    textAlign: 'center',
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.4s',
    transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Inactive until every field is mapped, then it "activates".
  genInactive: { opacity: 0.38, transform: 'scale(.99)' },
});
