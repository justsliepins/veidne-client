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
  title: { margin: '0 0 2px', fontWeight: 600 },
  text: { margin: 0 },
  standalone: {
    flexShrink: 0,
    alignSelf: 'center',
    width: 'calc(100% - 48px)',
    maxWidth: '720px',
    margin: '0 auto 12px',
    boxSizing: 'border-box',
    [media.below.md]: { width: 'calc(100% - 32px)' },
  },
});
