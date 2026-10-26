import { makeStyles } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    width: '100%',
    height: veidneTokens.layout.completionBarHeight,
    backgroundColor: '#FFFFFF',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: 'rgba(26, 22, 34, 0.06)',
    boxShadow: '0 1px 3px rgba(26, 22, 34, 0.05)',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
    [media.below.lg]: {
      height: veidneTokens.layout.completionBarCompactHeight,
      padding: '0 24px',
    },
    [media.below.sm]: {
      height: veidneTokens.layoutMobile.completionBarHeight,
      padding: '0 8px',
    },
  },
  steps: {
    display: 'flex',
    gap: '32px',
    flexGrow: 1, flexShrink: 1, flexBasis: 'auto',
    justifyContent: 'center',
    minWidth: '0',
    marginLeft: 'auto',
    marginRight: 'auto',
    [media.below.lg]: { gap: '20px' },
    [media.below.sm]: { gap: '12px' },
  },
  rootCompact: {
    width: '100%',
    height: veidneTokens.layout.completionBarCompactHeight,
    backgroundColor: '#FFFFFF',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: 'rgba(26, 22, 34, 0.06)',
    boxShadow: '0 1px 3px rgba(26, 22, 34, 0.05)',
    padding: '0 80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
    [media.below.md]: {
      // Above the full-screen preview sheet so Generate stays clickable.
      position: 'sticky',
      top: '0',
      zIndex: veidneTokens.zIndex.panel + 1,
    },
    [media.below.lg]: {
      padding: '0 24px',
    },
    [media.below.sm]: {
      height: veidneTokens.layoutMobile.completionBarHeight,
      padding: '0 8px',
    },
  },
  // Action buttons shrink on mobile
  action: {
    flexShrink: 0,
    [media.below.md]: {
      transform: 'scale(0.85)',
      transformOrigin: 'center',
    },
  },
});
