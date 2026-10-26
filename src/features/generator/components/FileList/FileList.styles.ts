import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    width: '100%', maxWidth: '400px', height: 'auto', maxHeight: '360px',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '8px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
    overflowY: 'auto',
    [media.below.sm]: { maxWidth: 'none' },
  },
  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '12px', height: '50px', marginTop: '8px',
  },
  arrow: {
    width: '26px', height: '50px',
    backgroundColor: '#FAFBFF', borderRadius: '6px',
    ...shorthands.borderStyle('none'), cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: 500, color: '#5E5560',
    ':hover': { backgroundColor: '#E8E8F0' },
    ':disabled': { opacity: 0.3, cursor: 'default' },
  },
  currentPage: { fontSize: '14px', fontWeight: 600, color: '#46529E' },
  pageText: { fontSize: '14px', fontWeight: 400, color: '#5E5560' },
});
