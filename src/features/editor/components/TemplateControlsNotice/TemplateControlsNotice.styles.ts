import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    margin: '0 0 12px',
    padding: '10px 14px',
    backgroundColor: '#FFFBEB',
    ...shorthands.border('1px', 'solid', '#FCD34D'),
    borderRadius: '8px',
    fontSize: '13px',
    lineHeight: '20px',
    color: '#78350F',
    [media.below.sm]: { fontSize: '12px', ...shorthands.padding('8px', '12px') },
  },
  icon: { flexShrink: 0, marginTop: '1px' },
  text: { margin: 0 },
});
