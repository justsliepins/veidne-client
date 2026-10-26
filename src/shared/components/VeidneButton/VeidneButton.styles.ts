import { makeStyles, tokens } from '@fluentui/react-components';

export const useVeidneButtonStyles = makeStyles({
  root: {
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '24px',
    paddingRight: '24px',
    borderRadius: '6px',
    gap: '8px',
    fontSize: '14px',
    lineHeight: '30px',
    fontWeight: 600,
  },
  large: {
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '32px',
    paddingRight: '32px',
    fontSize: '16px',
    lineHeight: '24px',
  },
  small: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    gap: '4px',
    fontSize: '13px',
  },
  // Ghost/secondary: neutral border + ink text (never brand colored), hover to ink.
  secondary: {
    borderTopWidth: '2px', borderRightWidth: '2px', borderBottomWidth: '2px', borderLeftWidth: '2px',
    borderTopColor: 'rgba(26,22,34,.14)', borderRightColor: 'rgba(26,22,34,.14)',
    borderBottomColor: 'rgba(26,22,34,.14)', borderLeftColor: 'rgba(26,22,34,.14)',
    color: tokens.colorNeutralForeground1,
    ':hover': {
      borderTopColor: tokens.colorNeutralForeground1, borderRightColor: tokens.colorNeutralForeground1,
      borderBottomColor: tokens.colorNeutralForeground1, borderLeftColor: tokens.colorNeutralForeground1,
    },
  },
  transparent: {
    borderTopWidth: '2px', borderRightWidth: '2px', borderBottomWidth: '2px', borderLeftWidth: '2px',
    borderTopColor: '#27272A', borderRightColor: '#27272A',
    borderBottomColor: '#27272A', borderLeftColor: '#27272A',
  },
});
