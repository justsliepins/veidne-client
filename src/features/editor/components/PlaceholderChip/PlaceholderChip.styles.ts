import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  chipWrapper: {
    position: 'relative',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '6px',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    padding: '4px 10px',
    gap: '6px',
    cursor: 'pointer',
    maxWidth: '280px',
    [media.below.sm]: { maxWidth: '100%' },
  },
  name: {
    fontSize: '15px', fontWeight: 500, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px',
    [media.below.sm]: { whiteSpace: 'normal' as const, wordBreak: 'break-all' as const, maxWidth: '100%' },
  },
  invisibleBackdrop: {
    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
    zIndex: veidneTokens.zIndex.backdrop,
  },
  desktopPanel: {
    position: 'absolute',
    top: '100%',
    left: '0',
    zIndex: veidneTokens.zIndex.modal,
    backgroundColor: '#FFFFFF',
    ...shorthands.borderRadius('8px'),
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    marginTop: '4px',
  },
  popover: {
    ...shorthands.padding('16px'), minWidth: '220px',
    [media.below.sm]: { minWidth: '0' },
  },
  backdrop: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(9, 9, 11, 0.3)', zIndex: veidneTokens.zIndex.backdrop,
  },
  // bottom tracks the keyboard inset so the rename input clears the keyboard.
  mobileSheet: {
    position: 'fixed', left: '0', right: '0', bottom: 'var(--kb-inset, 0px)', zIndex: veidneTokens.zIndex.modal,
    backgroundColor: '#FFFFFF', ...shorthands.padding('16px'),
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.12)',
    ...shorthands.borderRadius('12px', '12px', '0', '0'),
  },
  phName: { fontSize: '15px', fontWeight: 600, color: '#1A1622' },
  originalText: { fontSize: '14px', color: '#5E5560', fontStyle: 'italic' },
  occurrences: { fontSize: '13px', color: '#5E5560', paddingTop: '4px' },
  actions: {
    display: 'flex', gap: '8px', paddingTop: '12px',
    [media.below.sm]: { '& > button': { minHeight: '44px' } },
  },
  renameInput: { width: '100%' },
});
