import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  surface: { padding: '16px', minWidth: '260px' },
  backdrop: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(9, 9, 11, 0.3)', zIndex: veidneTokens.zIndex.backdrop,
  },
  // bottom tracks the keyboard inset so the name input + confirm clear the keyboard.
  mobileSheet: {
    position: 'fixed', left: '0', right: '0', bottom: 'var(--kb-inset, 0px)', zIndex: veidneTokens.zIndex.modal,
    backgroundColor: '#FFFFFF', ...shorthands.padding('16px'),
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.12)',
    ...shorthands.borderRadius('12px', '12px', '0', '0'),
  },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  input: { flexGrow: 1 },
  shakeInput: {
    flexGrow: 1,
    animationDuration: '300ms',
    animationName: {
      from: { transform: 'translateX(0)' },
      '20%': { transform: 'translateX(4px)' },
      '40%': { transform: 'translateX(-4px)' },
      '60%': { transform: 'translateX(2px)' },
      '80%': { transform: 'translateX(-2px)' },
      to: { transform: 'translateX(0)' },
    },
  },
  confirmBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer',
    color: '#46529E', padding: '4px',
    [media.below.sm]: { width: '44px', height: '44px' },
  },
  hint: { fontSize: '13px', color: '#5E5560', paddingTop: '8px' },
  mergeRow: { display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px' },
  mergeBtn: {
    backgroundColor: '#46529E', color: '#FFFFFF', ...shorthands.borderStyle('none'),
    ...shorthands.borderRadius('6px'), ...shorthands.padding('6px', '14px'),
    fontSize: '13px', cursor: 'pointer',
    [media.below.sm]: { minHeight: '44px' },
  },
  mergeCancelBtn: {
    backgroundColor: 'transparent', color: '#5E5560', ...shorthands.borderStyle('none'),
    ...shorthands.borderRadius('6px'), ...shorthands.padding('6px', '14px'),
    fontSize: '13px', cursor: 'pointer',
    [media.below.sm]: { minHeight: '44px' },
  },
});
