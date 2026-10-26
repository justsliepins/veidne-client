import { makeStyles } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';

export const usePageLayoutStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    // svh tracks the small viewport; the 100vh line is the old-browser fallback.
    minHeight: ['100vh', '100svh'],
    overflowX: 'hidden',
  },
  // dvh follows the dynamic viewport (URL bar show/hide) with a 100vh fallback.
  rootConstrained: { height: ['100vh', '100dvh'], minHeight: '0', overflow: 'hidden' },
  content: { flexGrow: 1 },
  contentConstrained: { overflow: 'hidden', minHeight: '0', display: 'flex', flexDirection: 'column' },
  skipLink: {
    position: 'absolute', left: '-9999px', top: '0', zIndex: veidneTokens.zIndex.toast,
    padding: '8px 16px', backgroundColor: '#5566C4', color: '#FFFFFF',
    fontSize: '14px', textDecorationLine: 'none',
    ':focus': { left: '8px', top: '8px' },
  },
});
