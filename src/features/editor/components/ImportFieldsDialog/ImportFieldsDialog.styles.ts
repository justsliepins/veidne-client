import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

const INK = '#1A1622';
const MUTED = '#5E5560';
const INDIGO = '#4F46E5';
const INDIGO_SOFT = 'rgba(79,70,229,.12)';
const LINE = '#E7E3EA';

export const useStyles = makeStyles({
  surface: {
    maxWidth: '560px',
    width: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    ...shorthands.padding('24px'),
    borderRadius: '14px',
    [media.below.sm]: { ...shorthands.padding('18px', '16px') },
  },
  title: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 600,
    color: INK,
  },
  helper: {
    margin: '0 0 12px',
    fontSize: '13px',
    lineHeight: 1.5,
    color: MUTED,
  },
  success: {
    margin: '0 0 14px',
    ...shorthands.padding('10px', '12px'),
    borderRadius: '8px',
    backgroundColor: '#F0FDF4',
    ...shorthands.border('1px', 'solid', '#BBF7D0'),
    color: '#166534',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  warn: {
    margin: '0 0 16px',
    ...shorthands.padding('12px', '14px'),
    borderRadius: '8px',
    backgroundColor: '#FFFBEB',
    ...shorthands.border('1px', 'solid', '#FCD34D'),
    color: '#78350F',
  },
  warnHead: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  warnIcon: { flexShrink: 0 },
  warnTitle: { margin: 0, fontSize: '14px', fontWeight: 600 },
  warnText: { margin: '0 0 8px', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' },
  warnActions: { display: 'flex', justifyContent: 'flex-start', marginTop: '4px' },
  list: {
    ...shorthands.border('1px', 'solid', LINE),
    borderRadius: '10px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  listHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '12px'),
    backgroundColor: '#FAF8FB',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: LINE,
  },
  listLabel: { fontSize: '12px', fontWeight: 600, color: MUTED },
  linkBtn: {
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('2px', '4px'),
    color: INDIGO,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecorationLine: 'underline',
  },
  row: {
    ...shorthands.padding('4px', '6px'),
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: LINE,
    ':last-child': { borderBottomStyle: 'none' },
  },
  rowLabel: { display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '8px', rowGap: '2px' },
  rowName: { fontWeight: 600, color: INK, wordBreak: 'break-word' },
  rowMeta: { fontSize: '12px', color: MUTED },
  rowHint: { margin: '0 0 6px 36px', fontSize: '12px', color: MUTED },
  chip: {
    display: 'inline-block',
    ...shorthands.padding('0', '6px'),
    borderRadius: '5px',
    backgroundColor: INDIGO_SOFT,
    color: INDIGO,
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  note: {
    margin: '0 0 12px',
    fontSize: '12.5px',
    lineHeight: 1.5,
    color: MUTED,
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '8px',
  },
});
