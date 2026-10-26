import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    width: 'auto', minWidth: '90px', height: '40px', padding: '10px',
    display: 'flex', alignItems: 'center', gap: '12px',
    marginLeft: 'auto', marginRight: 'auto',
  },
  arrow: {
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('none'),
    padding: '0',
    fontSize: '13px',
    color: '#5E5560',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    ':hover': { color: '#1A1622' },
    ':disabled': { opacity: 0.3, cursor: 'default' },
    [media.below.sm]: { width: '44px', height: '44px', justifyContent: 'center' },
  },
  counter: {
    fontSize: '13px', fontWeight: 400, color: '#1A1622', whiteSpace: 'nowrap',
    [media.below.sm]: { fontSize: '12px' },
  },
});
