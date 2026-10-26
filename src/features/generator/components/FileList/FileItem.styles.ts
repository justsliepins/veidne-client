import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex', alignItems: 'center', gap: '12px',
    width: '100%', height: '50px', boxSizing: 'border-box', ...shorthands.padding('0', '14px'),
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), borderRadius: '6px',
    fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
    ':hover': { backgroundColor: '#F3F3F8' },
    ':hover svg:last-child': { color: '#4F52B2' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#4F52B2', outlineOffset: '-2px' },
  },
  icon: { width: '20px', height: '20px', color: '#2B579A', flexShrink: 0 },
  name: {
    fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    flexGrow: 1, minWidth: 0, overflowX: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  ext: { color: '#8A8A94' },
  size: { fontSize: '13px', color: '#8A8A94', flexShrink: 0 },
  download: { width: '18px', height: '18px', color: '#8A8A94', flexShrink: 0 },
});
