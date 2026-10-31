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
    // Mobile: top-align so a tall form (with the keyboard up) scrolls fully to
    // its submit button instead of being clipped by vertical centering.
    [media.below.md]: { alignItems: 'flex-start' },
  },
  card: {
    width: '480px', backgroundColor: '#FFFFFF', borderRadius: '12px',
    boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)',
    padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px',
    // Auto block margins center it when it fits, collapse when it overflows.
    [media.below.md]: { width: 'min(480px, 95vw)', marginTop: 'auto', marginBottom: 'auto' },
    [media.below.sm]: { width: '95vw', ...shorthands.padding('20px') },
  },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: '0', fontSize: '24px', lineHeight: '32px', fontWeight: 700, color: '#1A1622' },
  // 44 px hit area around the 24 px icon; negative margins keep the icon where it was.
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0',
    width: '44px', height: '44px', marginTop: '-10px', marginBottom: '-10px', marginRight: '-10px',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  subtitle: { fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#5E5560' },
  label: { display: 'block', fontSize: '13px', lineHeight: '20px', fontWeight: 600, color: '#1A1622', marginBottom: '6px' },
  // A message about one field, directly under it (FORM-19).
  fieldError: { fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#B91C1C', marginTop: '4px' },
  hint: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#5E5560', marginTop: '4px' },
  input: {
    width: '100%', height: '48px', borderRadius: '6px', boxSizing: 'border-box',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#8A8494'),
    padding: '0 16px', fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none', '::placeholder': { color: '#5E5560' },
    ':focus': { ...shorthands.borderColor('#46529E') },
  },
  textarea: {
    width: '100%', minHeight: '120px', borderRadius: '6px', boxSizing: 'border-box',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#8A8494'),
    padding: '12px 16px', fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none', resize: 'vertical', fontFamily: 'inherit',
    '::placeholder': { color: '#5E5560' }, ':focus': { ...shorthands.borderColor('#46529E') },
  },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  fileBtn: {
    padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
    backgroundColor: '#F4F4FB', color: '#1A1622', cursor: 'pointer',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    ':hover': { backgroundColor: '#EBEBF5' },
    [media.below.sm]: { minHeight: '44px' },
  },
  fileName: {
    fontSize: '13px', color: '#1A1622', flexGrow: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fileRemove: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '13px', fontWeight: 500,
    padding: '4px 8px',
    ':hover': { color: '#EF4444' },
    [media.below.sm]: { minHeight: '44px' },
  },
  cta: {
    width: '100%', padding: '12px 24px', borderRadius: '6px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'),
    fontSize: '14px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
    ':hover': { backgroundColor: '#6B7CCE' },
    ':disabled': { opacity: '0.6', cursor: 'not-allowed' },
    [media.below.sm]: { minHeight: '44px' },
  },
  success: { fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#15803D', textAlign: 'center' },
  error: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#B91C1C', textAlign: 'center' },
  srOnly: {
    position: 'absolute', width: '1px', height: '1px',
    ...shorthands.padding('0'), ...shorthands.margin('-1px'),
    overflowX: 'hidden', overflowY: 'hidden',
    clipPath: 'inset(50%)', whiteSpace: 'nowrap', ...shorthands.borderStyle('none'),
  },
});
