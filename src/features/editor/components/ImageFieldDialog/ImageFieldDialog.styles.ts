import { makeStyles } from '@fluentui/react-components';

const INK = '#1A1622';
const MUTED = '#5E5560';
const INDIGO = '#4F46E5';
const INDIGO_SOFT = 'rgba(79,70,229,.12)';

export const useStyles = makeStyles({
  surface: {
    maxWidth: '420px',
    padding: '24px',
    borderRadius: '14px',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600,
    color: INK,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: INK,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    marginBottom: '12px',
  },
  helper: {
    margin: '0 0 18px',
    fontSize: '13px',
    lineHeight: 1.5,
    color: MUTED,
  },
  fieldChip: {
    display: 'inline-block',
    padding: '0 6px',
    borderRadius: '5px',
    backgroundColor: INDIGO_SOFT,
    color: INDIGO,
    fontWeight: 600,
    fontFamily: 'monospace',
    fontSize: '12.5px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
});
