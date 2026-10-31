import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  // Neutral, not amber: this is a check of a guess, not a warning.
  root: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    ...shorthands.padding('12px', '16px'),
    backgroundColor: '#FAFBFF',
    ...shorthands.border('1px', 'solid', '#E8E8F0'),
    borderRadius: '8px',
  },
  title: { fontSize: '13px', lineHeight: '20px', fontWeight: 600, color: '#1A1622' },
  text: { fontSize: '13px', lineHeight: '20px', color: '#5E5560', marginTop: '-6px' },
  group: { display: 'flex', flexDirection: 'column', gap: '2px' },
  label: { fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#5E5560' },
  options: {
    flexWrap: 'wrap' as const, columnGap: '4px', rowGap: '0',
    marginLeft: '-8px',
  },
  // Whole label clickable; 44 px rows on phones.
  option: {
    fontVariantNumeric: 'tabular-nums',
    [media.below.sm]: { minHeight: '44px', alignItems: 'center' },
  },
  srOnly: {
    position: 'absolute', width: '1px', height: '1px',
    ...shorthands.padding('0'), ...shorthands.margin('-1px'),
    overflowX: 'hidden', overflowY: 'hidden',
    clipPath: 'inset(50%)', whiteSpace: 'nowrap', ...shorthands.borderStyle('none'),
  },
});
