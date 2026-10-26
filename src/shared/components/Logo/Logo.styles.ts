import { makeStyles, tokens } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useLogoStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecorationLine: 'none',
    [media.below.md]: { marginRight: 'auto', minWidth: '0' },
  },
  icon: { height: '32px', width: '32px', objectFit: 'cover', objectPosition: 'top' },
  text: {
    fontSize: '20px',
    lineHeight: '30px',
    fontWeight: 700,
    color: tokens.colorBrandForeground1,
    [media.below.sm]: { fontSize: '18px', lineHeight: '26px' },
  },
});
