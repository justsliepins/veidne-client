import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    width: '380px',
    position: 'absolute' as const,
    right: '0',
    top: '0',
    bottom: '0',
    backgroundColor: '#FFFFFF',
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftColor: '#E8E8F0',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    [media.below.lg]: {
      width: '320px',
    },
    [media.below.md]: {
      position: 'fixed' as const,
      // Sit below the 56 px header and the completion bar, so the bar keeps
      // Generate clickable and this panel's own header (Replace data, Back to
      // Fields) is not hidden under the bar.
      top: `calc(${veidneTokens.layoutMobile.navHeight} + ${veidneTokens.layout.completionBarCompactHeight})`,
      left: '0',
      right: '0',
      height: [
        `calc(100vh - ${veidneTokens.layoutMobile.navHeight} - ${veidneTokens.layout.completionBarCompactHeight})`,
        `calc(100dvh - ${veidneTokens.layoutMobile.navHeight} - ${veidneTokens.layout.completionBarCompactHeight})`,
      ],
      width: '100%',
      zIndex: veidneTokens.zIndex.panel,
      borderLeftStyle: 'none',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
    },
    [media.below.sm]: {
      top: `calc(${veidneTokens.layoutMobile.navHeight} + ${veidneTokens.layoutMobile.completionBarHeight})`,
      height: [
        `calc(100vh - ${veidneTokens.layoutMobile.navHeight} - ${veidneTokens.layoutMobile.completionBarHeight})`,
        `calc(100dvh - ${veidneTokens.layoutMobile.navHeight} - ${veidneTokens.layoutMobile.completionBarHeight})`,
      ],
    },
  },
  header: {
    height: '56px',
    padding: '10px 20px',
    backgroundColor: '#FAFBFF',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: '#E8E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    [media.below.md]: { height: 'auto', minHeight: '56px', flexWrap: 'wrap', gap: '0 12px', ...shorthands.padding('4px', '16px') },
  },
  title: { fontSize: '15px', fontWeight: 600, color: '#1A1622' },
  headerLinks: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '12px' },
  backLink: {
    fontSize: '13px', color: '#46529E', cursor: 'pointer',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    [media.below.md]: { minHeight: '44px', fontSize: '14px' },
  },
  navigatorArea: { display: 'flex', justifyContent: 'center', padding: '12px 0' },
  formatsCard: { display: 'none', [media.below.md]: { display: 'block' } },
  rowIndicator: {
    marginLeft: '20px', marginRight: '20px',
    padding: '8px 12px',
    backgroundColor: veidneTokens.colors.rowIndicatorBg,
    borderRadius: '4px',
    fontSize: '13px',
    color: veidneTokens.colors.rowIndicatorText,
  },
  documentArea: {
    padding: '0 24px 24px 24px', flexGrow: 1,
    [media.below.md]: {
      display: 'flex',
      justifyContent: 'center',
    },
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    flexGrow: 1, padding: '40px 24px', textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '14px', lineHeight: '22px', color: '#5E5560', maxWidth: '280px',
    marginBottom: '16px', marginTop: '0',
  },
  fadeIn: {
    transitionProperty: 'opacity, transform',
    transitionDuration: '500ms',
    transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  panelHidden: {
    opacity: 0,
    transform: 'translateX(16px)',
  },
});
