import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '0 12px',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '6px',
  },
  icon: { fontSize: '20px', opacity: '0.5', color: '#5E5560' },
  input: {
    flexGrow: 1, height: '24px',
    ...shorthands.borderStyle('none'), outlineStyle: 'none',
    fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#1A1622',
    backgroundColor: 'transparent',
    '::placeholder': { color: '#5E5560' },
  },
});
