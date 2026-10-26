import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useRoadmapStyles = makeStyles({
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '80px 48px', gap: '48px',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'radial-gradient(120% 80% at 50% -12%, #F2F1FB 0%, #FFFFFF 55%)',
    [media.below.lg]: { padding: '48px 24px' },
    [media.below.sm]: { padding: '40px 16px', gap: '32px' },
  },
  title: {
    fontSize: '48px', lineHeight: '56px', fontWeight: 600, letterSpacing: '-0.025em', color: '#1A1622',
    [media.below.lg]: { fontSize: '36px', lineHeight: '44px' },
    [media.below.sm]: { fontSize: '28px', lineHeight: '36px' },
  },
  subtitle: { fontSize: '18px', lineHeight: '28px', fontWeight: 400, color: '#5E5560' },
  columns: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' },
  suggestHint: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 400, color: '#5E5560',
    textAlign: 'center', marginTop: '-24px',
  },
  suggestBtn: {
    padding: '12px 24px', borderRadius: '6px', backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('2px'), ...shorthands.borderColor('#46529E'),
    fontSize: '14px', fontWeight: 600, color: '#46529E', cursor: 'pointer',
    ':hover': { backgroundColor: '#FAFBFF' },
  },
});
