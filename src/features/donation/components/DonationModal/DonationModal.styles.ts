import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  overlay: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(9, 9, 11, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: veidneTokens.zIndex.modal,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    // Mobile: top-align so a tall card (with the keyboard up) scrolls fully to its
    // last button instead of being clipped by vertical centering.
    [media.below.md]: { alignItems: 'flex-start' },
  },
  card: {
    width: '480px',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    borderRadius: '18px',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.06), 0 24px 60px -24px rgba(26, 22, 34, 0.45)',
    padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
    // Auto block margins keep it centered when it fits, collapse to 0 when it
    // overflows so the whole card stays scrollable.
    [media.below.md]: { width: 'min(480px, 95vw)', marginTop: 'auto', marginBottom: 'auto' },
    [media.below.sm]: { width: '95vw', ...shorthands.padding('24px') },
  },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.01em', color: '#1A1622' },
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', padding: '0',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  subtitle: { fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#5E5560' },
  amountGrid: {
    display: 'flex', gap: '12px',
    [media.below.sm]: { flexWrap: 'wrap' as const },
  },
  // Neutral selectable chips; the solid periwinkle fill is reserved for the donate action.
  presetBtn: {
    width: '120px', height: '48px', borderRadius: '11px',
    backgroundColor: '#FFFFFF', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'),
    fontSize: '15px', fontWeight: 600, color: '#1A1622', cursor: 'pointer',
    transitionProperty: 'background-color, border-color, color',
    transitionDuration: '0.15s',
    ':hover': { ...shorthands.borderColor('#46529E') },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { width: 'calc(50% - 6px)' },
  },
  presetBtnSelected: {
    backgroundColor: 'rgba(85, 102, 196, 0.12)',
    ...shorthands.borderColor('#46529E'),
    color: '#46529E',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.16)' },
  },
  customInput: {
    width: '100%', height: '48px', borderRadius: '11px',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'),
    padding: '0 16px', fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none', boxSizing: 'border-box',
    '::placeholder': { color: '#767077' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '1px' },
  },
  // The single primary action: periwinkle fill, darkens on hover.
  cta: {
    width: '100%', padding: '14px 24px', borderRadius: '11px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'),
    fontSize: '15px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    ':disabled': { opacity: '0.6', cursor: 'not-allowed' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  error: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#D9534F', textAlign: 'center' },
});
