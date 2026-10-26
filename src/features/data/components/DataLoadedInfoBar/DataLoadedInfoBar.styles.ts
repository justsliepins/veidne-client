import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 20px',
    backgroundColor: '#F0FDF4',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: '#BBF7D0',
    fontSize: '13px',
    lineHeight: '20px',
    color: '#166534',
    fontWeight: 500,
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
    [media.below.sm]: {
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      fontSize: '12px',
      ...shorthands.padding('8px', '12px'),
      gap: '8px',
    },
  },
  hidden: {
    opacity: 0,
    transform: 'translateY(-8px)',
  },
  visible: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  text: {
    flexGrow: 1,
    textAlign: 'center' as const,
    [media.below.sm]: {
      width: '100%',
      flexGrow: 0,
    },
  },
  gotIt: {
    flexShrink: 0,
    padding: '4px 12px',
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('#BBF7D0'),
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#166534',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#DCFCE7' },
    [media.below.sm]: {
      minHeight: '44px',
      ...shorthands.padding('8px', '16px'),
    },
  },
});
