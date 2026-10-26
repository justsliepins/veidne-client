import { makeStyles, tokens } from '@fluentui/react-components';
import { veidneTypography } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useUseCaseGuideStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    maxWidth: '760px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '80px',
    paddingBottom: '80px',
    paddingLeft: '48px',
    paddingRight: '48px',
    gap: '28px',
    backgroundColor: '#FFFFFF',
    [media.below.lg]: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '24px', paddingRight: '24px' },
    [media.below.sm]: { paddingTop: '40px', paddingBottom: '40px', paddingLeft: '16px', paddingRight: '16px', gap: '24px' },
  },
  title: {
    ...veidneTypography.h1,
    color: tokens.colorNeutralForeground1,
    letterSpacing: '-0.025em',
    [media.below.lg]: { fontSize: '36px', lineHeight: '44px' },
    [media.below.sm]: { fontSize: '28px', lineHeight: '36px' },
  },
  lastUpdated: {
    ...veidneTypography.bodySmall,
    color: tokens.colorNeutralForeground3,
    marginTop: '-16px',
  },
  answer: {
    ...veidneTypography.bodyLarge,
    color: tokens.colorNeutralForeground1,
  },
  // Wraps the shared hero CTAs: full width so the buttons can stack edge to
  // edge on narrow phones, and the hero's 22px gap between row and counter.
  ctaBlock: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '22px',
  },
  infoBlock: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '24px',
    [media.below.sm]: { padding: '18px' },
    borderRadius: '14px',
    backgroundColor: '#FCFCFF',
    border: '1px solid rgba(26, 22, 34, 0.06)',
  },
  infoRow: {
    ...veidneTypography.bodyRegular,
    color: tokens.colorNeutralForeground2,
  },
  infoLabel: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  sectionHeading: {
    ...veidneTypography.h3,
    color: tokens.colorNeutralForeground1,
    marginTop: '12px',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    margin: '0',
    paddingLeft: '22px',
  },
  step: {
    ...veidneTypography.bodyRegular,
    color: tokens.colorNeutralForeground2,
  },
  extraPara: {
    ...veidneTypography.bodyRegular,
    color: tokens.colorNeutralForeground2,
  },
  extraLead: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },
  faqItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  faqQuestion: {
    ...veidneTypography.bodyRegular,
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  faqAnswer: {
    ...veidneTypography.bodyRegular,
    color: tokens.colorNeutralForeground2,
  },
});
