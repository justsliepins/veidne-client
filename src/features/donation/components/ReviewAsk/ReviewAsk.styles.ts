import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  // Neutral, lightly tinted card. Deliberately quieter than the periwinkle
  // donation card (DonateInline) so it reads as subordinate to the support ask
  // it sits below.
  card: {
    width: '100%', maxWidth: '520px', boxSizing: 'border-box',
    backgroundColor: 'rgba(26, 22, 34, 0.025)',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.10)'),
    borderRadius: '14px',
    ...shorthands.padding('20px'),
    display: 'flex', flexDirection: 'column', gap: '12px',
    textAlign: 'center',
    [media.below.sm]: { ...shorthands.padding('18px', '16px') },
  },
  // Sub-heading, lighter than the donation card heading.
  heading: {
    fontSize: '16px', lineHeight: '22px', fontWeight: 600, letterSpacing: '-0.01em',
    color: '#1A1622',
  },
  body: {
    fontSize: '14px', lineHeight: '21px', fontWeight: 400, color: '#5E5560',
    maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto',
  },
  // Primary-ish action, rendered as a link. Periwinkle outline variant (mirrors
  // DonateInline's "Other" button) so it stays subordinate to the filled
  // donation buttons above.
  cta: {
    alignSelf: 'center',
    minHeight: '44px', ...shorthands.padding('0', '20px'),
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#5566C4'),
    borderRadius: '11px',
    fontSize: '15px', fontWeight: 600, color: '#46529E', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    textDecorationLine: 'none',
    transitionProperty: 'background-color, border-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.08)', ...shorthands.borderColor('#46529E') },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  // Secondary text link ("send us a line"); matches DoneView's supportLink.
  line: {
    fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#767077',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer',
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline', color: '#5E5560' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
  // Condensed repeat-visit row: one quiet line, no card chrome.
  condensedRow: {
    fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#767077',
    textAlign: 'center', maxWidth: '520px',
  },
  condensedLink: {
    color: '#46529E', fontWeight: 500, cursor: 'pointer',
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
});
