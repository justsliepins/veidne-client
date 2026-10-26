import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

const PERIWINKLE = '#5566C4';
const PERIWINKLE_INK = '#46529E';

export const useStyles = makeStyles({
  // Utility action: periwinkle outline, never the solid fill (reserved for Generate).
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1.5px'),
    ...shorthands.borderColor(PERIWINKLE),
    color: PERIWINKLE_INK,
    borderRadius: '11px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.15s',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.08)' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: PERIWINKLE, outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.md]: { padding: '6px 10px', fontSize: '12px' },
  },
  triggerDisabled: {
    ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'),
    color: '#9A93A3',
    cursor: 'not-allowed',
    ':hover': { backgroundColor: '#FFFFFF' },
  },
  chevron: {
    fontSize: '16px',
    marginLeft: '-2px',
  },

  popover: {
    ...shorthands.padding('6px'),
    borderRadius: '12px',
    maxWidth: '320px',
    animationName: {
      from: { opacity: 0, transform: 'translateY(-4px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '120ms',
    animationTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      animationDuration: '0s',
    },
    [media.below.md]: { maxWidth: 'calc(100vw - 32px)' },
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '3px',
    ...shorthands.padding('10px', '12px'),
    borderRadius: '8px',
  },
  itemHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1622',
  },
  tag: {
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '16px',
    color: PERIWINKLE_INK,
    backgroundColor: 'rgba(85, 102, 196, 0.12)',
    borderRadius: '6px',
    ...shorthands.padding('1px', '7px'),
  },
  itemDesc: {
    display: 'block',
    fontSize: '12px',
    lineHeight: '18px',
    color: '#6B7280',
    whiteSpace: 'normal',
  },
});
