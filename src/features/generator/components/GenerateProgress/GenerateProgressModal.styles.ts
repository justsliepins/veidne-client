import { makeStyles } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  surface: {
    maxWidth: '420px',
    width: 'min(420px, 95vw)',
    padding: '36px 32px',
    borderRadius: '18px',
    textAlign: 'center',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.06), 0 24px 60px -24px rgba(26, 22, 34, 0.45)',
    [media.below.sm]: { padding: '24px' },
  },
  title: {
    fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: '#1A1622',
    marginBottom: '24px',
  },
  bar: {
    '& .fui-ProgressBar__bar': { backgroundColor: '#5566C4' },
  },
  barTrack: {
    backgroundColor: '#E8E8F0',
    height: '8px', borderRadius: '4px',
  },
  counter: {
    fontSize: '15px', fontWeight: 400, color: '#5E5560',
    marginTop: '16px',
  },
  cancelWrapper: { marginTop: '24px' },
});
