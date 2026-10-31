import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

const focusRing = { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' } as const;

export const useStyles = makeStyles({
  root: {
    ...shorthands.margin('16px', '24px', '0'),
    ...shorthands.padding('16px', '20px'),
    backgroundColor: '#FFFFFF',
    ...shorthands.border('1px', 'solid', '#F3C4C4'),
    borderLeftWidth: '4px', borderLeftColor: '#B91C1C',
    ...shorthands.borderRadius('8px'),
    flexShrink: 0,
    ':focus-visible': focusRing,
    [media.below.md]: { ...shorthands.margin('12px', '16px', '0') },
  },
  head: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  icon: { color: '#B91C1C', flexShrink: 0, marginTop: '2px' },
  title: { flexGrow: 1, margin: '0', fontSize: '16px', lineHeight: '24px', fontWeight: 600, color: '#1A1622' },
  close: {
    flexShrink: 0, width: '44px', height: '44px', marginTop: '-10px', marginRight: '-12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer', color: '#5E5560',
    ':focus-visible': focusRing,
  },
  cause: { ...shorthands.margin('4px', '0', '0', '30px'), fontSize: '15px', lineHeight: '22px', color: '#1A1622', overflowWrap: 'anywhere' },
  actions: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
    ...shorthands.margin('12px', '0', '0', '30px'),
  },
  primary: {
    minHeight: '44px', ...shorthands.padding('0', '20px'), ...shorthands.borderRadius('8px'),
    backgroundColor: '#5566C4', color: '#FFFFFF', ...shorthands.borderStyle('none'),
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': focusRing,
  },
  secondary: {
    minHeight: '44px', ...shorthands.padding('0', '16px'), ...shorthands.borderRadius('8px'),
    backgroundColor: '#FFFFFF', color: '#1A1622', ...shorthands.border('1px', 'solid', 'rgba(26, 22, 34, 0.24)'),
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    ':focus-visible': focusRing,
  },
  link: {
    display: 'inline-flex', alignItems: 'center', minHeight: '44px',
    fontSize: '14px', fontWeight: 500, color: '#46529E', textDecorationLine: 'underline',
    ':focus-visible': focusRing,
  },
});
