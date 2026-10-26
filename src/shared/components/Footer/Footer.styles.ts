import { makeStyles, tokens } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useFooterStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '32px',
    padding: '32px 48px',
    minHeight: '84px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    [media.below.lg]: {
      paddingLeft: '32px',
      paddingRight: '32px',
    },
    [media.below.md]: {
      flexDirection: 'column' as const,
      height: 'auto',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingLeft: '16px',
      paddingRight: '16px',
      gap: '16px',
      textAlign: 'center' as const,
    },
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexGrow: 1,
    [media.below.md]: {
      justifyContent: 'center',
      flexGrow: 0,
    },
  },
  copyright: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: tokens.colorNeutralForeground2 },
  guides: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    [media.below.md]: {
      alignItems: 'center',
    },
  },
  guidesHeading: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: tokens.colorNeutralForeground3,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    [media.below.md]: {
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '12px',
    },
  },
  link: {
    textDecorationLine: 'none',
    fontSize: '13px',
    lineHeight: '20px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground2,
    [media.below.md]: {
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
      paddingRight: '8px',
    },
  },
  // Last row of the footer: flexBasis 100% wraps it under the three columns.
  funding: {
    flexBasis: '100%',
    margin: '0',
    fontSize: '13px',
    lineHeight: '20px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground3,
    [media.below.md]: { textAlign: 'center' as const },
  },
  fundingLink: {
    color: tokens.colorNeutralForeground2,
    textDecorationLine: 'underline',
    textUnderlineOffset: '2px',
  },
  linkBtn: {
    backgroundColor: 'transparent',
    borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none',
    padding: '0',
    fontSize: '13px',
    lineHeight: '20px',
    fontWeight: 400,
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    fontFamily: 'inherit',
    [media.below.md]: {
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
      paddingRight: '8px',
    },
  },
});
