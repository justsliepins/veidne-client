import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  surface: { padding: '16px', minWidth: '260px' },
  // bottom tracks the keyboard inset so the name input + confirm clear the keyboard.
  // No backdrop sits behind it: the document above stays tappable. The sheet
  // scrolls inside itself instead of covering the document when content is long.
  mobileSheet: {
    position: 'fixed', left: '0', right: '0', bottom: 'var(--kb-inset, 0px)', zIndex: veidneTokens.zIndex.modal,
    backgroundColor: '#FFFFFF', ...shorthands.padding('16px'),
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.12)',
    ...shorthands.borderRadius('12px', '12px', '0', '0'),
    ...shorthands.borderTop('1px', 'solid', '#E8E8F0'),
    maxHeight: ['calc(100vh - var(--kb-inset, 0px) - 160px)', 'calc(100dvh - var(--kb-inset, 0px) - 160px)'],
    overflowY: 'auto',
  },
  selected: {
    marginTop: '0', marginBottom: '10px',
    fontSize: '15px', lineHeight: '22px', fontWeight: 600, color: '#1A1622',
    overflowWrap: 'anywhere',
  },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  input: { flexGrow: 1, [media.below.sm]: { minHeight: '44px' } },
  shakeInput: {
    flexGrow: 1,
    [media.below.sm]: { minHeight: '44px' },
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
  // Phone sheet: Extend to next word, then Cancel, on one row under the input.
  sheetActions: { display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '12px' },
  sheetBtn: {
    minHeight: '44px', ...shorthands.padding('0', '16px'),
    backgroundColor: '#FFFFFF', color: '#46529E',
    ...shorthands.border('1px', 'solid', '#46529E'), ...shorthands.borderRadius('8px'),
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    ':disabled': { color: '#5E5560', ...shorthands.borderColor('#C8C8D0'), cursor: 'default' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  sheetCancel: {
    minHeight: '44px', ...shorthands.padding('0', '16px'),
    backgroundColor: 'transparent', color: '#5E5560', ...shorthands.borderStyle('none'),
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
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
