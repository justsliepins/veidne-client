import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

const slideDown = { from: { transform: 'translateY(-100%)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } };

export const useStyles = makeStyles({
  root: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#F0F4F8', padding: '12px 24px', borderRadius: '8px', marginBottom: '16px',
    animationName: slideDown, animationDuration: '200ms', animationTimingFunction: 'ease-out',
    [media.below.sm]: {
      flexWrap: 'wrap' as const, justifyContent: 'center',
      ...shorthands.padding('10px', '16px'), ...shorthands.gap('8px'),
    },
  },
  icon: {
    color: '#46529E', fontSize: '16px', flexShrink: 0,
    [media.below.sm]: { display: 'none' },
  },
  message: {
    fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    transitionProperty: 'opacity', transitionDuration: '300ms', transitionTimingFunction: 'ease',
    [media.below.sm]: { width: '100%', textAlign: 'center', fontSize: '14px' },
  },
  skip: {
    marginLeft: 'auto', fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#5E5560',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer', whiteSpace: 'nowrap',
    textDecorationLine: 'none', flexShrink: 0,
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    [media.below.sm]: { marginLeft: '0', minHeight: '44px', display: 'flex', alignItems: 'center' },
  },
  loadBtn: {
    backgroundColor: '#5566C4', color: '#FFFFFF', fontSize: '14px', lineHeight: '20px', fontWeight: 600,
    padding: '8px 16px', borderRadius: '6px', ...shorthands.borderStyle('none'), cursor: 'pointer', whiteSpace: 'nowrap',
    flexShrink: 0,
    ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    [media.below.sm]: { minHeight: '44px' },
  },
  ctaRoot: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    backgroundColor: '#FFFFFF', ...shorthands.borderWidth('1px'), ...shorthands.borderStyle('solid'), ...shorthands.borderColor('#E8E8F0'),
    padding: '24px', borderRadius: '8px', marginBottom: '16px',
    animationName: slideDown, animationDuration: '200ms', animationTimingFunction: 'ease-out',
    [media.below.sm]: { ...shorthands.padding('16px') },
  },
  ctaHeading: {
    fontSize: '18px', lineHeight: '28px', fontWeight: 600, color: '#1A1622',
    [media.below.sm]: { fontSize: '16px', lineHeight: '24px' },
  },
  ctaBtnRow: {
    display: 'flex', gap: '16px', alignItems: 'center',
    [media.below.sm]: { flexWrap: 'wrap' as const, justifyContent: 'center', ...shorthands.gap('12px') },
  },
  ctaPrimary: {
    backgroundColor: '#5566C4', color: '#FFFFFF', fontSize: '14px', lineHeight: '20px', fontWeight: 600,
    padding: '12px 24px', borderRadius: '6px', ...shorthands.borderStyle('none'), cursor: 'pointer',
    ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
  ctaGhost: {
    backgroundColor: 'transparent', color: '#46529E', fontSize: '14px', lineHeight: '20px', fontWeight: 600,
    padding: '12px 24px', borderRadius: '6px', ...shorthands.borderStyle('none'), cursor: 'pointer',
    ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
});
