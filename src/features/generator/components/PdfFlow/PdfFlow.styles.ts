import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

// PdfFlow owns the action + aggregate zone and the file list for the PDF phases
// mounted inside DoneView. Periwinkle is the only action color; 44px targets;
// all motion gated behind prefers-reduced-motion (ruling 8 layout: this surface
// top-aligns and grows downward, the file list's own scroll window contains it).
export const useStyles = makeStyles({
  root: {
    width: '100%', maxWidth: '600px',
    marginLeft: 'auto', marginRight: 'auto',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center' as const,
  },

  // --- aggregate zone (headings / bars / counts) ---------------------------
  heading: {
    fontSize: '22px', fontWeight: 600, color: '#1A1622', marginBottom: '8px',
  },
  // Status pill: periwinkle tint (In line); neutral grey variant (At capacity).
  pill: {
    display: 'inline-block', backgroundColor: 'rgba(85, 102, 196, 0.14)', color: '#46529E',
    fontWeight: 600, fontSize: '13px', ...shorthands.padding('6px', '14px'),
    ...shorthands.borderRadius('999px'), marginBottom: '16px',
  },
  pillNeutral: { backgroundColor: 'rgba(26, 22, 34, 0.06)', color: '#5E5560' },
  // Coarse wait estimate, large and unmissable.
  big: { fontSize: '34px', fontWeight: 600, color: '#1A1622', marginBottom: '6px' },
  sub: {
    fontSize: '15px', lineHeight: '1.55', color: '#5E5560',
    maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '22px',
  },
  // Calm success tile reused from DoneView's treatment (ruling 10: the large
  // decorative check keeps the existing DoneView look), dark-green check for AA.
  checkBig: {
    width: '64px', height: '64px',
    backgroundImage: 'linear-gradient(140deg, #DBF6EA, #EAFBF3)',
    ...shorthands.border('1px', 'solid', 'rgba(62, 201, 138, 0.3)'),
    ...shorthands.borderRadius('20px'),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#15803D',
    boxShadow: '0 6px 14px -6px rgba(62, 201, 138, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
    marginLeft: 'auto', marginRight: 'auto', marginBottom: '16px',
  },

  bar: {
    height: '8px', width: '100%', maxWidth: '440px',
    backgroundColor: 'rgba(26, 22, 34, 0.08)', borderRadius: '999px',
    overflowX: 'hidden', overflowY: 'hidden',
    marginLeft: 'auto', marginRight: 'auto', marginBottom: '10px',
  },
  fill: {
    height: '100%', backgroundColor: '#5566C4', borderRadius: '999px',
    transitionProperty: 'width', transitionDuration: '0.3s', transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Indeterminate (sending): a sliding sliver; a static partial fill under
  // reduced motion.
  fillIndet: {
    width: '38%',
    animationName: {
      from: { transform: 'translateX(-110%)' },
      to: { transform: 'translateX(290%)' },
    },
    animationDuration: '1.4s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none', width: '60%' },
  },
  count: {
    fontSize: '14px', color: '#5E5560', marginBottom: '22px',
  },
  hint: {
    fontSize: '13px', lineHeight: '1.55', color: '#767077',
    maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
  },
  micro: {
    fontSize: '13px', lineHeight: '1.55', color: '#767077',
    maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto', marginTop: '4px',
  },

  // --- actions -------------------------------------------------------------
  row: {
    display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center',
    flexWrap: 'wrap', marginBottom: '18px',
    [media.below.sm]: { flexDirection: 'column', width: '100%', ...shorthands.gap('12px') },
  },
  btnPrimary: {
    minHeight: '44px', ...shorthands.padding('0', '24px'), ...shorthands.borderRadius('11px'),
    backgroundColor: '#5566C4', color: '#FFFFFF', ...shorthands.borderStyle('none'),
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':active': { backgroundColor: '#3F4E9C' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: '100%' },
  },
  btnOutline: {
    minHeight: '44px', ...shorthands.padding('0', '24px'), ...shorthands.borderRadius('11px'),
    backgroundColor: '#FFFFFF', color: '#46529E',
    ...shorthands.border('1px', 'solid', '#5566C4'),
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.14)' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: '100%' },
  },
  btnQuiet: {
    minHeight: '44px', ...shorthands.padding('0', '10px'),
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), color: '#46529E',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    [media.below.sm]: { width: '100%' },
  },

  // --- privacy microcopy ---------------------------------------------------
  privacy: {
    display: 'flex', gap: '10px', alignItems: 'flex-start', textAlign: 'left' as const,
    backgroundColor: 'rgba(85, 102, 196, 0.14)', borderRadius: '12px',
    ...shorthands.padding('13px', '15px'),
    fontSize: '13px', lineHeight: '1.55', color: '#1A1622',
    maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto',
  },
  shield: { flexShrink: 0, marginTop: '1px' },

  // --- consent gate -------------------------------------------------------
  // Checkbox row: centered, 44px hit target, periwinkle accent (the only action
  // color). The label is paired with the box so meaning never rides on color.
  optRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    minHeight: '44px', marginBottom: '6px',
  },
  checkbox: {
    width: '18px', height: '18px', accentColor: '#5566C4', cursor: 'pointer',
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
  checkLabel: { fontSize: '14px', color: '#5E5560', cursor: 'pointer' },
});
