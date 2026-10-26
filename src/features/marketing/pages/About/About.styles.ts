import { makeStyles, tokens } from '@fluentui/react-components';
import { veidneTypography } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useAboutStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '720px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '80px',
    paddingBottom: '80px',
    paddingLeft: '48px',
    paddingRight: '48px',
    gap: '48px',
    [media.below.lg]: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '24px', paddingRight: '24px' },
    [media.below.sm]: { paddingTop: '40px', paddingBottom: '40px', paddingLeft: '16px', paddingRight: '16px', gap: '32px' },
  },
  pageTitle: {
    ...veidneTypography.h1, color: tokens.colorNeutralForeground1, textAlign: 'center',
    [media.below.lg]: { fontSize: '36px', lineHeight: '44px' },
    [media.below.sm]: { fontSize: '28px', lineHeight: '36px' },
  },
  section: { display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' },
  costsHeading: { ...veidneTypography.h3, color: tokens.colorNeutralForeground1, textAlign: 'left' },
  storyParagraph: { ...veidneTypography.bodyLarge, color: tokens.colorNeutralForeground2, textAlign: 'left' },
  boldText: { fontWeight: 700 },
  // Same treatment as the external links in the donation components.
  inlineLink: {
    color: '#5566C4', fontWeight: 500, textDecorationLine: 'underline', overflowWrap: 'anywhere',
    ':hover': { color: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  founders: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  foundersName: {
    fontSize: '18px',
    lineHeight: '28px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  founderQuote: {
    ...veidneTypography.bodyRegular,
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
  },
  supportBox: {
    width: '100%',
    padding: '34px 30px',
    [media.below.sm]: { padding: '24px' },
    borderRadius: '18px',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    border: '1px solid rgba(26, 22, 34, 0.06)',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.04), 0 14px 34px -18px rgba(60, 50, 70, 0.22)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  supportHeading: { ...veidneTypography.h3, color: tokens.colorNeutralForeground1 },
  supportDescription: {
    ...veidneTypography.bodyRegular,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
  },
  thankYou: { fontSize: '15px', lineHeight: '24px', fontWeight: 600, color: '#15803D', textAlign: 'center' },
});
