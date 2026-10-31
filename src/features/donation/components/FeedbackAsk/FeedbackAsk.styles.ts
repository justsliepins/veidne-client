import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  // Neutral card, quieter than the periwinkle donation card.
  card: {
    width: '100%', maxWidth: '520px', boxSizing: 'border-box',
    backgroundColor: 'rgba(26, 22, 34, 0.025)',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.10)'),
    borderRadius: '14px', ...shorthands.padding('16px', '20px'),
    display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center',
    [media.below.sm]: { ...shorthands.padding('14px', '16px') },
  },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap',
  },
  question: { margin: '0', fontSize: '16px', lineHeight: '22px', fontWeight: 600, color: '#1A1622' },
  choices: { display: 'flex', gap: '8px' },
  choice: {
    minHeight: '44px', minWidth: '96px', ...shorthands.padding('0', '16px'),
    backgroundColor: '#FFFFFF', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#5566C4'),
    borderRadius: '11px', fontSize: '15px', fontWeight: 600, color: '#46529E', cursor: 'pointer',
    ':hover': { backgroundColor: 'rgba(85, 102, 196, 0.08)' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  reasons: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '10px' },
  reason: {
    minHeight: '40px', ...shorthands.padding('0', '14px'),
    backgroundColor: '#FFFFFF', ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.18)'),
    borderRadius: '999px', fontSize: '14px', color: '#1A1622', cursor: 'pointer',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  reasonOn: { backgroundColor: '#EEF0FB', ...shorthands.borderColor('#5566C4'), color: '#2E3A86', fontWeight: 600 },
  help: { margin: '10px 0 0', fontSize: '14px', lineHeight: '21px', color: '#3F3A46' },
  review: { margin: '0', fontSize: '13px', lineHeight: '20px', color: '#5E5560' },
  // Underlined, not colour alone (WCAG 1.4.1).
  link: {
    color: '#46529E', fontWeight: 500, textDecorationLine: 'underline', whiteSpace: 'nowrap',
    ':hover': { color: '#2E3A86' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
});
