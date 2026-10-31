import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

// Neutral colours: it states how values are written; it is not a success
// (green data-loaded bar) or a warning (amber empty-fields bar).
export const useStyles = makeStyles({
  root: {
    flexShrink: 0,
    fontSize: '13px', lineHeight: '20px', color: '#5E5560',
  },
  // Same size and padding as DataLoadedInfoBar, directly under it.
  bar: {
    ...shorthands.padding('8px', '20px'),
    backgroundColor: '#FAFBFF',
    borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#E8E8F0',
  },
  // Same box as the File names card in the preview panel.
  card: {
    marginLeft: '20px', marginRight: '20px', marginTop: '8px', marginBottom: '4px',
    ...shorthands.padding('10px', '12px'),
    backgroundColor: '#FAFBFF',
    ...shorthands.border('1px', 'solid', '#E8E8F0'),
    borderRadius: '10px',
  },
  line: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
  },
  lineCard: { justifyContent: 'space-between', flexWrap: 'wrap' as const, rowGap: '8px' },
  text: { textAlign: 'center' as const },
  textCard: { textAlign: 'left' as const, flexBasis: '0', flexGrow: 1, minWidth: '180px' },
  toggle: {
    flexShrink: 0,
    ...shorthands.padding('4px', '12px'),
    backgroundColor: 'transparent',
    ...shorthands.border('1px', 'solid', '#C5CAE9'),
    borderRadius: '4px',
    fontSize: '12px', fontWeight: 600, color: '#46529E',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#EEF0FA' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    // Phones and tablets: a 44 px target.
    [media.below.md]: { minHeight: '44px', ...shorthands.padding('8px', '16px') },
  },
  panel: {
    maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', marginTop: '8px',
  },
});
