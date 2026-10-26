import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 20px',
    backgroundColor: '#FEFCE8',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: '#FDE68A',
    fontSize: '13px',
    lineHeight: '20px',
    color: '#854D0E',
    fontWeight: 500,
    [media.below.sm]: {
      flexWrap: 'wrap' as const,
      fontSize: '12px',
      ...shorthands.padding('8px', '12px'),
      gap: '8px',
    },
  },
  text: {
    textAlign: 'center',
  },
  button: {
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    color: '#854D0E',
    backgroundColor: 'transparent',
    ...shorthands.border('1px', 'solid', '#D6B656'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('4px', '12px'),
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#FEF3C7',
    },
  },
});
