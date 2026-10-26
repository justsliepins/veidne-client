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
  title: { fontSize: '24px', lineHeight: '32px', fontWeight: 700, color: '#1A1622' },
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', padding: '0',
  },
  subtitle: { fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#5E5560' },
  label: { fontSize: '13px', lineHeight: '20px', fontWeight: 600, color: '#1A1622', marginBottom: '6px' },
  input: {
    width: '100%', height: '48px', borderRadius: '6px', boxSizing: 'border-box',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    padding: '0 16px', fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none', '::placeholder': { color: '#5E5560' },
    ':focus': { ...shorthands.borderColor('#46529E') },
  },
  textarea: {
    width: '100%', minHeight: '120px', borderRadius: '6px', boxSizing: 'border-box',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    padding: '12px 16px', fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    outlineStyle: 'none', resize: 'vertical', fontFamily: 'inherit',
    '::placeholder': { color: '#5E5560' }, ':focus': { ...shorthands.borderColor('#46529E') },
  },
  cta: {
    width: '100%', padding: '12px 24px', borderRadius: '6px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'),
    fontSize: '14px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
    ':hover': { backgroundColor: '#6B7CCE' },
    ':disabled': { opacity: '0.6', cursor: 'not-allowed' },
  },
  success: { fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#15803D', textAlign: 'center' },
  error: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#EF4444', textAlign: 'center' },
});
