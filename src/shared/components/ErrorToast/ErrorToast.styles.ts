import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  root: {
    position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
    zIndex: veidneTokens.zIndex.toast, backgroundColor: '#FFFFFF', borderRadius: '8px',
    borderLeftStyle: 'solid', borderLeftWidth: '4px', borderLeftColor: '#EF4444',
    boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.08)',
    padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px',
    maxWidth: '480px',
    transitionProperty: 'opacity, transform', transitionDuration: '200ms', transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: {
      // Sit above the soft keyboard so errors stay visible while typing.
      left: '16px', right: '16px', bottom: 'calc(16px + var(--kb-inset, 0px))',
      transform: 'none', maxWidth: 'none',
    },
  },
  visible: {
    opacity: 1, transform: 'translateX(-50%) translateY(0)', pointerEvents: 'auto' as const,
    [media.below.sm]: { transform: 'translateY(0)' },
  },
  hidden: {
    opacity: 0, transform: 'translateX(-50%) translateY(16px)', pointerEvents: 'none' as const,
    [media.below.sm]: { transform: 'translateY(16px)' },
  },
  icon: { color: '#EF4444', fontSize: '16px', flexShrink: 0 },
  message: { fontSize: '14px', lineHeight: '20px', fontWeight: 400, color: '#1A1622' },
  // With actions the toast becomes a small panel: message row on top, the
  // actions underneath, and it stays until dismissed.
  withActions: { flexDirection: 'column', alignItems: 'stretch', gap: '10px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  closeBtn: {
    marginLeft: 'auto', flexShrink: 0, ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', display: 'flex', alignItems: 'center', padding: '0',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', paddingLeft: '28px' },
});
