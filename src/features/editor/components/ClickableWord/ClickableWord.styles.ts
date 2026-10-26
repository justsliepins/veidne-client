import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  word: {
    display: 'inline',
    // The hover/selection box needs padding and a border, but those must not
    // widen the gap between words: 1px padding + 1px border per side, cancelled
    // by a -2px margin, so adjacent words sit a natural space apart and the
    // box only bleeds into the surrounding space.
    ...shorthands.padding('1px', '1px'),
    ...shorthands.margin('0', '-2px'),
    ...shorthands.borderRadius('2px'),
    fontWeight: 400,
    color: '#1A1622',
    cursor: 'pointer',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('transparent'),
    ':hover': {
      backgroundColor: veidneTokens.colors.wordHoverBg,
      textDecorationLine: 'underline',
      textDecorationColor: veidneTokens.colors.wordHoverUnderline,
    },
    // Keyboard focus ring for the roving-tabindex word; mouse focus stays quiet.
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: '#46529E',
      outlineOffset: '1px',
    },
  },
  bold: { fontWeight: 700 },
  italic: { fontStyle: 'italic' },
  selected: {
    backgroundColor: veidneTokens.colors.wordSelected,
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('#46529E'),
    borderRadius: '12px',
    color: '#46529E',
    ':hover': { backgroundColor: veidneTokens.colors.wordSelected, textDecorationLine: 'none' },
  },
  rangePreview: {
    backgroundColor: veidneTokens.colors.wordRangePreview,
    ':hover': { backgroundColor: veidneTokens.colors.wordRangePreview, textDecorationLine: 'none' },
  },
  disabled: {
    cursor: 'default',
    opacity: 0.7,
    ':hover': { backgroundColor: 'transparent', textDecorationLine: 'none' },
  },
  demoTarget: {
    animationName: {
      '0%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: 'rgba(85, 102, 196, 0.15)' },
      '100%': { backgroundColor: 'transparent' },
    },
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    borderRadius: '2px',
  },
  // pre-wrap keeps runs of spaces and tabs as the document has them but, unlike
  // pre, leaves the space as a line-break opportunity. With pre, Firefox finds
  // no place to break between words and splits them mid-word instead.
  space: { display: 'inline', whiteSpace: 'pre-wrap' },
});
