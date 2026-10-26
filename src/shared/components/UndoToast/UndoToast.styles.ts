import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    backgroundColor: '#1A1622',
    color: '#FFFFFF',
    ...shorthands.padding('8px', '24px'),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('16px'),
    transitionProperty: 'opacity, max-height',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease',
    overflow: 'hidden',
  },
  visible: { opacity: 1, maxHeight: '48px' },
  hidden: { opacity: 0, maxHeight: '0', ...shorthands.padding('0', '24px') },
  message: { fontSize: '14px', lineHeight: '20px', fontWeight: 400, color: '#FFFFFF' },
  undo: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#46529E',
    cursor: 'pointer', backgroundColor: 'transparent', ...shorthands.borderStyle('none'), ...shorthands.padding('0'),
    ':hover': { textDecorationLine: 'underline' },
  },
  undoDisabled: {
    opacity: 0.4,
    cursor: 'default',
    ':hover': { textDecorationLine: 'none' },
  },
});
