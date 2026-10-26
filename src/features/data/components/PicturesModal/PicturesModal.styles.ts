import { makeStyles, shorthands } from '@fluentui/react-components';

const INK = '#1A1622';
const MUTED = '#5E5560';
const INDIGO = '#4F46E5';
const INDIGO_SOFT = 'rgba(79,70,229,.1)';

export const useStyles = makeStyles({
  surface: {
    maxWidth: '780px',
    width: '92vw',
    ...shorthands.padding('24px'),
    ...shorthands.borderRadius('14px'),
  },
  title: { margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: INK },
  body: { margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5, color: MUTED },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' },
  chip: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: INDIGO,
    backgroundColor: INDIGO_SOFT,
    ...shorthands.padding('3px', '8px'),
    ...shorthands.borderRadius('6px'),
  },
  chipMore: { fontSize: '12px', color: MUTED, ...shorthands.padding('3px', '4px') },
  buttonRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '14px' },
  // The skip link sits in the bottom-left, de-emphasized against Choose images.
  buttonRowStart: { justifyContent: 'flex-start' },
  skipLink: {
    ...shorthands.border('none'),
    backgroundColor: 'transparent',
    ...shorthands.padding('4px', '0'),
    color: MUTED,
    fontSize: '14px',
    cursor: 'pointer',
    textDecorationLine: 'underline',
    ':hover': { color: INK },
  },
});
