import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px',
    backgroundColor: '#FAFBFF',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '12px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
    [media.below.sm]: { maxWidth: '100%', ...shorthands.padding('16px') },
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1A1622',
    margin: '0',
  },
  description: {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#5E5560',
    margin: '0',
  },
  demoRow: {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#5E5560',
    margin: '0',
  },
  demoLink: {
    // Rendered as a <button> but must read as the inline text link it replaced,
    // so strip the native button chrome.
    ...shorthands.borderStyle('none'),
    ...shorthands.padding('0'),
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#46529E',
    cursor: 'pointer',
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline' },
  },
});
