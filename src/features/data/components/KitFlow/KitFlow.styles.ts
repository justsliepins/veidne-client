import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, minHeight: '0', overflowY: 'auto', padding: '32px 24px',
    [media.below.sm]: { ...shorthands.padding('16px', '12px') },
  },
  inner: { width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', listStyleType: 'none', ...shorthands.padding('0'), ...shorthands.margin('0') },
  step: { display: 'flex', gap: '16px', position: 'relative' as const },
  connector: { position: 'absolute' as const, left: '11px', top: '24px', bottom: '0', width: '2px', backgroundColor: '#E8E8F0' },
  connectorDone: { backgroundColor: '#3EC98A' },
  circle: { width: '24px', height: '24px', minWidth: '24px', borderRadius: '50%', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: '#5E5560', backgroundColor: '#FFFFFF', zIndex: 1 },
  circleDone: { backgroundColor: '#3EC98A', ...shorthands.borderColor('#3EC98A'), color: '#FFFFFF' },
  stepBody: { flexGrow: 1, paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' },
  stepTitle: { fontSize: '16px', fontWeight: 600, color: '#1A1622' },
  stepDesc: { fontSize: '14px', color: '#5E5560', lineHeight: '22px' },
  // Data preview surface: hairline border + soft layered shadow, rounded.
  tableWrap: {
    backgroundColor: '#FFFFFF', borderRadius: '16px', overflowX: 'auto' as const,
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.06)'),
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.04), 0 14px 34px -18px rgba(60, 50, 70, 0.22)',
  },
  // Genuine primary action: periwinkle fill, darkens on hover.
  downloadBtn: {
    width: '100%', height: '48px', backgroundColor: '#5566C4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...shorthands.borderStyle('none'), borderRadius: '11px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 8px 18px -10px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Completed status (downloaded): calm success, not an action.
  downloadedBtn: { width: '100%', height: '48px', backgroundColor: 'rgba(62, 201, 138, 0.14)', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(62, 201, 138, 0.45)'), borderRadius: '11px', fontSize: '15px', fontWeight: 600, ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' } },
  againBtn: { width: '100%', height: '48px', backgroundColor: '#FFFFFF', color: '#5E5560', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.14)'), borderRadius: '11px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', ':hover': { ...shorthands.borderColor('#1A1622'), color: '#1A1622' }, ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' } },
  fileName: { fontSize: '12px', color: '#767077', textAlign: 'center' as const, marginTop: '-4px' },
  backLink: { fontSize: '13px', color: '#46529E', cursor: 'pointer', alignSelf: 'flex-start', backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0', marginTop: '8px', ':hover': { textDecorationLine: 'underline' }, ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' } },
  dropPulse: { borderRadius: '16px', animationName: { from: { boxShadow: '0 0 0 0 rgba(85, 102, 196, 0)' }, to: { boxShadow: '0 0 0 4px rgba(85, 102, 196, 0.12)' } }, animationDuration: '1.5s', animationIterationCount: 'infinite', animationDirection: 'alternate', '@media (prefers-reduced-motion: reduce)': { animationName: 'none' } },
});
