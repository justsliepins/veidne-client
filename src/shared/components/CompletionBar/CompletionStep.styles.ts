import { makeStyles } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    [media.below.lg]: {
      flexDirection: 'column',
      gap: '2px',
    },
  },
  circle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transitionProperty: 'background-color',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
  },
  circleComplete: { backgroundColor: veidneTokens.colors.successGreen },
  circleActive: { backgroundColor: '#5566C4' },
  circlePending: { backgroundColor: veidneTokens.colors.pendingCircle },
  icon: { color: '#FFFFFF', fontSize: '16px' },
  numberActive: { fontSize: '14px', fontWeight: 600, color: '#FFFFFF' },
  numberPending: { fontSize: '14px', fontWeight: 600, color: veidneTokens.colors.pendingGray },
  textColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxWidth: '100px',
    minWidth: '0',
    [media.below.lg]: { display: 'none' },
  },
  label: {
    fontSize: '14px', fontWeight: 500, color: '#1A1622',
    transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'ease',
  },
  statusComplete: {
    fontSize: '12px', color: veidneTokens.colors.successGreen,
    transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'ease',
  },
  statusActive: {
    fontSize: '12px', color: '#46529E',
    transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'ease',
  },
  statusPending: {
    fontSize: '12px', color: veidneTokens.colors.pendingGray,
    transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'ease',
  },
  subLabel: {
    fontSize: '9px', color: '#6B7280', textAlign: 'center' as const,
    marginTop: '2px',
    overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  // Small badge shown below circle for active step when text column is hidden
  mobileLabel: {
    display: 'none',
    [media.below.lg]: {
      display: 'block',
      fontSize: '10px',
      fontWeight: 600,
      color: '#46529E',
      textAlign: 'center' as const,
      whiteSpace: 'nowrap' as const,
    },
  },
});
