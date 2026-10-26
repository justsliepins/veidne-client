import { makeStyles, shorthands } from '@fluentui/react-components';

const INK = '#1A1622';
const MUTED = '#5E5560';
const FAINT = '#767077';
const INDIGO = '#4F46E5';
const AMBER = '#B45309';
const AMBER_SOFT = 'rgba(180,83,9,.08)';

export const useStyles = makeStyles({
  card: {
    backgroundColor: '#FFFFFF',
    ...shorthands.border('1px', 'solid', 'rgba(26,22,34,.1)'),
    ...shorthands.borderRadius('12px'),
    ...shorthands.padding('16px'),
    marginBottom: '14px',
    width: '100%',
    maxWidth: '720px',
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14.5px',
    fontWeight: 600,
    color: INK,
    marginBottom: '12px',
  },
  headingIcon: { fontSize: '18px', color: INDIGO, flexShrink: 0 },
  // The pre-collapsed heading acts as a full-width expand toggle.
  headingToggle: {
    width: '100%',
    ...shorthands.border('none'),
    ...shorthands.padding('0'),
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    color: INK,
  },
  headingText: { flexGrow: 1 },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    ...shorthands.border('1.5px', 'dashed', 'rgba(26,22,34,.18)'),
    ...shorthands.borderRadius('10px'),
    ...shorthands.padding('18px'),
    textAlign: 'center',
  },
  dropCopy: { fontSize: '13.5px', color: MUTED },
  subline: { fontSize: '12px', color: FAINT },
  error: {
    marginTop: '10px',
    fontSize: '13px',
    color: '#B91C1C',
    backgroundColor: 'rgba(185,28,28,.07)',
    ...shorthands.padding('8px', '10px'),
    ...shorthands.borderRadius('8px'),
  },
  added: { marginTop: '10px', fontSize: '13px', color: MUTED },
  collapsedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...shorthands.padding('6px', '2px'),
  },
  collapsedCheck: { color: '#3EC98A', flexShrink: 0 },
  collapsedText: { flexGrow: 1, fontSize: '13px', color: INK },
  matchPanel: { marginTop: '12px' },
  summary: { fontSize: '13.5px', fontWeight: 600, color: INK, marginBottom: '8px' },
  unmatchedRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: AMBER_SOFT,
    color: AMBER,
    fontSize: '12.5px',
    ...shorthands.padding('7px', '10px'),
    ...shorthands.borderRadius('8px'),
    marginBottom: '6px',
  },
  unmatchedText: { flexGrow: 1, minWidth: '200px' },
  resolutionSelect: {
    fontSize: '12.5px',
    ...shorthands.padding('4px', '6px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'solid', 'rgba(26,22,34,.18)'),
    backgroundColor: '#FFFFFF',
    color: INK,
    maxWidth: '100%',
  },
  unreferenced: { marginTop: '6px', fontSize: '12.5px', color: FAINT },
});
