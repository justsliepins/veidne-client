import { makeStyles } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useNotFoundStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 180px)',
    padding: '80px 48px',
    gap: '24px',
    textAlign: 'center',
    [media.below.lg]: { padding: '48px 24px' },
    [media.below.sm]: { padding: '40px 16px' },
  },
  title: {
    fontSize: '48px',
    lineHeight: '56px',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: '#1A1622',
    [media.below.lg]: { fontSize: '36px', lineHeight: '44px' },
    [media.below.sm]: { fontSize: '28px', lineHeight: '36px' },
  },
  subtitle: {
    fontSize: '18px',
    lineHeight: '28px',
    fontWeight: 400,
    color: '#5E5560',
  },
  link: {
    textDecorationLine: 'none',
  },
});
