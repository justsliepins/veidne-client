import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    ...shorthands.borderStyle('dashed'),
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '12px',
    backgroundColor: '#FAFBFF',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    maxWidth: '480px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    overflowWrap: 'break-word',
    minHeight: '220px',
    justifyContent: 'center',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '0.15s',
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.sm]: { ...shorthands.padding('32px', '16px'), maxWidth: '100%' },
  },
  // Clear drag-over affordance: periwinkle border + soft tint.
  dragOver: {
    ...shorthands.borderColor('#5566C4'),
    backgroundColor: 'rgba(85, 102, 196, 0.08)',
  },
  icon: { fontSize: '48px', color: '#46529E' },
  title: { fontSize: '18px', lineHeight: '28px', fontWeight: 600, color: '#1A1622' },
  subtitle: { fontSize: '15px', lineHeight: '24px', color: '#5E5560' },
  formatHint: { fontSize: '13px', lineHeight: '20px', color: '#5E5560', marginTop: '12px' },
  hidden: { display: 'none' },
  inlineError: {
    marginTop: '10px',
    fontSize: '13px',
    color: '#B91C1C',
    backgroundColor: 'rgba(185,28,28,.07)',
    ...shorthands.padding('8px', '12px'),
    ...shorthands.borderRadius('8px'),
    maxWidth: '90%',
  },
  reassurance: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#5E5560',
  },
});
