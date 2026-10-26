import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  // Lightly tinted periwinkle card, clearly secondary to the download actions above.
  card: {
    width: '100%', maxWidth: '520px', boxSizing: 'border-box',
    backgroundColor: 'rgba(85, 102, 196, 0.06)',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(85, 102, 196, 0.18)'),
    borderRadius: '14px',
    ...shorthands.padding('24px'),
    display: 'flex', flexDirection: 'column', gap: '14px',
    textAlign: 'center',
    [media.below.sm]: { ...shorthands.padding('20px', '16px') },
  },
  // Sub-heading, not the page h1.
  heading: {
    fontSize: '18px', lineHeight: '24px', fontWeight: 600, letterSpacing: '-0.01em',
    color: '#1A1622',
  },
  body: {
    fontSize: '14px', lineHeight: '21px', fontWeight: 400, color: '#5E5560',
    maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto',
  },
  // Four equal choices: 3, 5, 10 and Other. Two per row on narrow screens.
  amounts: {
    display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px',
    marginTop: '2px',
    [media.below.sm]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
  // Selectable chip: white with a periwinkle border by default, filled when active.
  chip: {
    minHeight: '60px', ...shorthands.padding('8px', '6px'),
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(85, 102, 196, 0.45)'),
    borderRadius: '11px',
    color: '#46529E', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
    transitionProperty: 'background-color, border-color, color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.08)', ...shorthands.borderColor('#46529E') },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    ':disabled': { opacity: '0.55', cursor: 'not-allowed' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  chipActive: {
    backgroundColor: '#5566C4', ...shorthands.borderColor('#5566C4'), color: '#FFFFFF',
    ':hover': { backgroundColor: '#46529E', ...shorthands.borderColor('#46529E') },
  },
  chipAmount: { fontSize: '15px', lineHeight: '20px', fontWeight: 600 },
  chipSub: { fontSize: '11px', lineHeight: '14px', fontWeight: 400, opacity: '0.85' },
  // Revealed custom row. The max-height transition is the only motion; it is
  // disabled under reduced-motion so the row simply appears.
  customRegion: {
    overflow: 'hidden',
    maxHeight: '0',
    transitionProperty: 'max-height',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  customRegionOpen: {
    maxHeight: '120px',
  },
  customRow: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
    paddingTop: '4px',
    [media.below.sm]: { flexWrap: 'wrap' as const },
  },
  customLabel: { fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#1A1622' },
  customInput: {
    width: '120px', minHeight: '44px', boxSizing: 'border-box',
    borderRadius: '11px',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.18)'),
    ...shorthands.padding('0', '14px'),
    fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none',
    ':focus-visible': { ...shorthands.borderColor('#5566C4'), outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '1px' },
  },
  // The one action: periwinkle fill, same shape as the other primary buttons.
  cta: {
    minHeight: '48px', ...shorthands.padding('0', '24px'),
    alignSelf: 'center', minWidth: '220px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'), borderRadius: '11px',
    fontSize: '15px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 18px -10px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    ':disabled': { opacity: '0.55', cursor: 'not-allowed', backgroundColor: '#5566C4' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: '100%' },
  },
  micro: {
    fontSize: '12px', lineHeight: '18px', fontWeight: 400, color: '#767077',
    maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto',
  },
  // Error sits in an aria-live region; it conveys meaning in text, not color alone.
  error: {
    fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#EF4444',
  },
});
