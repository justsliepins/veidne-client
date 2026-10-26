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
      // Sit below the completion bar so its Generate action stays clickable;
      // the bar is raised above this sheet on mobile (see CompletionBar).
      top: veidneTokens.layout.completionBarCompactHeight,
      left: '0',
      right: '0',
      height: ['calc(100vh - 54px)', 'calc(100dvh - 54px)'],
      width: '100%',
      zIndex: veidneTokens.zIndex.panel,
      borderLeftStyle: 'none',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
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
  },
  title: { fontSize: '15px', fontWeight: 600, color: '#1A1622' },
  backLink: {
    fontSize: '13px', color: '#46529E', cursor: 'pointer',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0',
    ':hover': { textDecorationLine: 'underline' },
  },
  navigatorArea: { display: 'flex', justifyContent: 'center', padding: '12px 0' },
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
  },
  panelHidden: {
    opacity: 0,
    transform: 'translateX(16px)',
  },
});
