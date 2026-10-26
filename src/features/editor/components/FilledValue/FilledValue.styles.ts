import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    display: 'inline',
    fontWeight: 400,
    color: '#1A1622',
    textDecorationLine: 'underline',
    textDecorationThickness: '2px',
    textUnderlineOffset: '3px',
    cursor: 'default',
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
  },
  empty: {
    display: 'inline',
    fontWeight: 400,
    fontStyle: 'italic',
    color: '#5E5560',
    cursor: 'default',
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
  },
  revealing: {
    opacity: 0,
    transform: 'translateY(4px)',
  },
});
