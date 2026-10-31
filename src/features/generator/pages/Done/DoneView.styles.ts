import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    padding: '48px 0', gap: '32px', flexGrow: 1,
    [media.below.md]: { ...shorthands.padding('40px', '24px') },
    [media.below.sm]: { ...shorthands.padding('32px', '16px') },
  },
  // When the PDF flow is on the surface can grow tall (status rows), so top-align
  // the scroll region and let the inner content's auto block margins keep it
  // centered when it fits, scrolling from the top when it overflows (ruling 8).
  rootScroll: { justifyContent: 'flex-start' },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
    width: '100%', marginTop: 'auto', marginBottom: 'auto',
  },
  // Calm success affirmation: soft green tile (mirrors the icon-tile craft),
  // dark-green check for AA contrast on the light fill.
  successIcon: {
    width: '64px', height: '64px',
    backgroundImage: 'linear-gradient(140deg, #DBF6EA, #EAFBF3)',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(62, 201, 138, 0.3)'),
    borderRadius: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#15803D',
    boxShadow: '0 6px 14px -6px rgba(62, 201, 138, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
  },
  title: {
    margin: '0', outlineStyle: 'none',
    fontSize: '32px', lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.02em',
    color: '#1A1622', textAlign: 'center',
    [media.below.md]: { fontSize: '26px', lineHeight: '34px' },
    [media.below.sm]: { fontSize: '22px', lineHeight: '28px' },
  },
  subtitle: {
    fontSize: '18px', lineHeight: '28px', fontWeight: 400,
    color: '#5E5560', textAlign: 'center',
  },
  actions: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '16px',
    [media.below.sm]: { flexDirection: 'column', width: '100%', ...shorthands.gap('12px') },
  },
  // Quiet row of the user's own files: label plus text links, one line when
  // it fits, wrapping on narrow screens.
  sourceRow: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    columnGap: '16px', rowGap: '6px',
    fontSize: '13px', lineHeight: '20px',
    marginTop: '-12px',
  },
  sourceLabel: { color: '#767077', fontWeight: 400 },
  sourceLink: {
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0',
    fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#5566C4', cursor: 'pointer',
    textDecorationLine: 'underline',
    ':hover': { color: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  // Genuine primary action: periwinkle fill, darkens on hover, soft lift shadow.
  btnPrimary: {
    padding: '0 28px', height: '52px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'), borderRadius: '11px',
    fontSize: '15px', fontWeight: 600, color: '#FFFFFF',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    boxShadow: '0 8px 18px -10px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: '100%' },
  },
  btnOutline: {
    padding: '0 28px', height: '52px',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'),
    borderRadius: '11px',
    fontSize: '15px', fontWeight: 600, color: '#1A1622',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    textDecorationLine: 'none',
    transitionProperty: 'border-color, color', transitionDuration: '0.2s',
    ':hover': { ...shorthands.borderColor('#1A1622') },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  startOver: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 400, color: '#5E5560',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer',
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
  demoSubtitle: {
    fontSize: '16px', lineHeight: '24px', fontWeight: 400,
    color: '#5E5560', textAlign: 'center', maxWidth: '520px',
  },
  // Genuine primary action for the demo-complete flow: periwinkle fill.
  demoCta: {
    padding: '0 32px', height: '52px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'), borderRadius: '11px',
    fontSize: '16px', fontWeight: 600, color: '#FFFFFF',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    textDecorationLine: 'none',
    boxShadow: '0 8px 18px -10px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  demoSecondary: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
    [media.below.sm]: { flexDirection: 'column', width: '100%', ...shorthands.gap('12px') },
  },
  btnGhost: {
    padding: '0 20px', height: '44px',
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'),
    borderRadius: '11px',
    fontSize: '14px', fontWeight: 500, color: '#1A1622',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    textDecorationLine: 'none',
    transitionProperty: 'border-color', transitionDuration: '0.2s',
    ':hover': { ...shorthands.borderColor('#1A1622') },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: '100%' },
  },
  // The saved notice before anything is saved: in the page for screen readers
  // (an empty live region), out of the layout and its gaps.
  srOnly: {
    position: 'absolute', width: '1px', height: '1px',
    ...shorthands.padding('0'), ...shorthands.margin('-1px'),
    overflowX: 'hidden', overflowY: 'hidden',
    clipPath: 'inset(50%)', whiteSpace: 'nowrap', ...shorthands.borderStyle('none'),
  },
  // Confirms what the download produced, in place of a dialog title doing it.
  saved: {
    '& svg': { flexShrink: 0 },
    display: 'flex', alignItems: 'center', gap: '8px', margin: '-12px 0 0',
    fontSize: '15px', lineHeight: '22px', fontWeight: 500, color: '#166534', textAlign: 'center',
  },
  // One calm line for the donation ask after the dialog, or for donors.
  quietAsk: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 12px',
    fontSize: '14px', lineHeight: '20px', color: '#3F3A46', textAlign: 'center', maxWidth: '520px',
  },
  quietBtn: {
    minHeight: '36px', ...shorthands.padding('0', '14px'),
    backgroundColor: '#FFFFFF', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#5566C4'),
    borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#46529E', cursor: 'pointer',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.08)' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  sampleNext: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    width: '100%', maxWidth: '520px', boxSizing: 'border-box', ...shorthands.padding('20px'),
    backgroundColor: '#F4F5FC', borderRadius: '14px',
  },
  sampleText: { margin: '0', fontSize: '15px', lineHeight: '22px', color: '#3F3A46', textAlign: 'center' },
  // "Next time": the reusable template and the two ways to start again.
  nextTime: {
    width: '100%', maxWidth: '520px', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    ...shorthands.borderTop('1px', 'solid', 'rgba(26, 22, 34, 0.10)'), paddingTop: '24px',
  },
  nextTitle: { margin: '0', fontSize: '16px', lineHeight: '22px', fontWeight: 600, color: '#1A1622' },
  nextText: { margin: '0', fontSize: '14px', lineHeight: '21px', color: '#5E5560', textAlign: 'center' },
  confirm: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    ...shorthands.padding('16px'), borderRadius: '12px', backgroundColor: '#FEF2F2', width: '100%', boxSizing: 'border-box',
  },
  confirmText: { margin: '0', fontSize: '14px', lineHeight: '21px', color: '#7F1D1D', textAlign: 'center', fontWeight: 500 },
  btnDanger: {
    padding: '0 20px', height: '44px', backgroundColor: '#B91C1C', ...shorthands.borderStyle('none'), borderRadius: '11px',
    fontSize: '14px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
    ':hover': { backgroundColor: '#991B1B' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    [media.below.sm]: { width: '100%' },
  },
});
