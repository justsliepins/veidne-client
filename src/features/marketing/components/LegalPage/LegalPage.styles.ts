import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { veidneTypography } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

/** Shared by the privacy notice and the accessibility page: one readable
 *  column, descriptive h2 sections, tables that wrap on phones. */
export const useLegalPageStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', gap: '20px',
    maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto',
    paddingTop: '64px', paddingBottom: '80px', paddingLeft: '48px', paddingRight: '48px',
    [media.below.lg]: { paddingTop: '48px', paddingBottom: '56px', paddingLeft: '24px', paddingRight: '24px' },
    [media.below.sm]: { paddingTop: '32px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
  },
  title: {
    ...veidneTypography.h1, color: tokens.colorNeutralForeground1,
    [media.below.lg]: { fontSize: '36px', lineHeight: '44px' },
    [media.below.sm]: { fontSize: '28px', lineHeight: '36px' },
  },
  draft: {
    ...veidneTypography.bodyRegular, color: '#5C3B00', backgroundColor: '#FFF4CE',
    border: '1px solid #E8C35C', borderRadius: '8px', padding: '12px 16px',
  },
  lead: { ...veidneTypography.bodyLarge, color: tokens.colorNeutralForeground1 },
  updated: { ...veidneTypography.bodySmall, color: tokens.colorNeutralForeground2 },
  toc: {
    display: 'flex', flexDirection: 'column', gap: '4px',
    borderLeft: `3px solid ${tokens.colorNeutralStroke1}`, paddingLeft: '16px',
  },
  tocHeading: { ...veidneTypography.bodySmall, fontWeight: 600, color: tokens.colorNeutralForeground2 },
  tocList: { listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '2px' },
  h2: {
    ...veidneTypography.h3, color: tokens.colorNeutralForeground1, marginTop: '24px', scrollMarginTop: '24px',
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '4px' },
    [media.below.sm]: { fontSize: '22px', lineHeight: '30px' },
  },
  h3: { fontSize: '18px', lineHeight: '26px', fontWeight: 600, color: tokens.colorNeutralForeground1, marginTop: '8px' },
  p: { ...veidneTypography.bodyRegular, fontSize: '16px', lineHeight: '26px', color: tokens.colorNeutralForeground2, maxWidth: '70ch' },
  list: {
    ...veidneTypography.bodyRegular, fontSize: '16px', lineHeight: '26px', color: tokens.colorNeutralForeground2,
    paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '70ch',
  },
  // Tables wrap instead of scrolling sideways, down to 320 px (WCAG 1.4.10).
  tableWrap: { width: '100%' },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '15px', lineHeight: '22px',
    color: tokens.colorNeutralForeground2,
    '& th, & td': {
      textAlign: 'left', verticalAlign: 'top', padding: '10px 12px', overflowWrap: 'anywhere',
      borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    '& thead th': { color: tokens.colorNeutralForeground1, fontWeight: 600 },
    '& tbody th': { color: tokens.colorNeutralForeground1, fontWeight: 600 },
    [media.below.sm]: { fontSize: '14px', lineHeight: '20px', '& th, & td': { padding: '8px 6px' } },
  },
  // The cookie choice on the privacy notice: the current choice and a
  // secondary button that opens the cookie banner again.
  consentRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' },
  consentButton: {
    minHeight: '44px', paddingLeft: '20px', paddingRight: '20px', borderRadius: '8px',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#46529E'), backgroundColor: '#FFFFFF', color: '#46529E',
    fontSize: '15px', lineHeight: '20px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
    ':hover': { backgroundColor: '#EEF0FA' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
  },
  code: { fontFamily: 'Consolas, Menlo, monospace', fontSize: '14px', overflowWrap: 'anywhere' },
  // Links inside sentences (exempt from the target-size minimum, WCAG 2.5.8).
  link: {
    color: '#46529E', textDecorationLine: 'underline', textUnderlineOffset: '2px', overflowWrap: 'anywhere',
    ':hover': { color: '#2F3A80' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
  },
  // "On this page" links: a list, so they get full-height targets on phones, like the footer.
  tocLink: {
    ...veidneTypography.bodyRegular, color: '#46529E', textDecorationLine: 'underline', textUnderlineOffset: '2px',
    ':hover': { color: '#2F3A80' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
    [media.below.md]: { display: 'flex', alignItems: 'center', minHeight: '44px' },
  },
});
