import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    padding: '48px 0', gap: '24px', flexGrow: 1,
    minHeight: ['100vh', '100svh'],
    [media.below.md]: { ...shorthands.padding('32px', '16px') },
  },
  iconCircle: {
    width: '64px', height: '64px',
    backgroundColor: '#EF4444', borderRadius: '90px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#FFFFFF',
  },
  title: {
    fontSize: '32px', lineHeight: '40px', fontWeight: 700,
    color: '#1A1622', textAlign: 'center',
    [media.below.md]: { fontSize: '24px', lineHeight: '32px' },
  },
  subtitle: {
    fontSize: '18px', lineHeight: '28px', fontWeight: 400,
    color: '#5E5560', textAlign: 'center', maxWidth: '480px',
    [media.below.sm]: { fontSize: '15px', lineHeight: '24px' },
  },
  btn: {
    padding: '12px 24px',
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'), borderRadius: '6px',
    fontSize: '14px', fontWeight: 600, color: '#FFFFFF',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#6B7CCE' },
  },
});
