import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  uploadWrapper: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flexGrow: 1, padding: '48px 24px', gap: '24px',
    [media.below.md]: {
      padding: '32px 16px',
    },
  },
  // The two quiet links under the upload zone.
  uploadLinks: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '24px', rowGap: '8px',
  },
  uploadLink: {
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0',
    fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#5566C4', cursor: 'pointer',
    textDecorationLine: 'underline',
    ':hover': { color: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  documentWrapper: {
    display: 'flex',
    flexGrow: 1,
    position: 'relative' as const,
    paddingRight: '280px',
    overflow: 'hidden',
    minHeight: '0',
    transitionProperty: 'padding-right',
    transitionDuration: '300ms',
    transitionTimingFunction: 'ease',
    [media.below.lg]: {
      paddingRight: '240px',
    },
    [media.below.md]: {
      paddingRight: '0',
    },
  },
  documentWrapperPreview: {
    paddingRight: '380px',
    [media.below.lg]: {
      paddingRight: '320px',
    },
    [media.below.md]: {
      paddingRight: '0',
    },
  },
  documentWrapperFull: { paddingRight: '0' },
  documentColumn: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, overflow: 'hidden', minHeight: '0' },
  content: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: '0',
    paddingTop: '16px',
    [media.below.md]: {
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
    },
  },
  contentCompact: { paddingTop: '0' },
  contentDone: { paddingTop: '16px' },
  btnGenerate: {
    backgroundColor: '#5566C4', ...shorthands.borderStyle('none'), borderRadius: '11px', padding: '12px 24px',
    fontSize: '15px', fontWeight: 600, color: '#FFFFFF',
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
    boxShadow: '0 8px 18px -10px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':disabled': { backgroundColor: '#9AA4DB', cursor: 'not-allowed', boxShadow: 'none' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    [media.below.md]: {
      padding: '8px 16px',
      fontSize: '13px',
    },
  },
  // The step bar's right slot: the template link, then Generate, one line.
  generateRow: { display: 'flex', alignItems: 'center', gap: '16px' },
  // Text link that reads as one: no fill, no border, underlined.
  saveTemplateLink: {
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), padding: '0',
    fontSize: '11px', lineHeight: '16px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
    color: '#4F52B2', textDecorationLine: 'underline', textUnderlineOffset: '2px',
    ':hover': { color: '#3B3E8F' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  countBadge: { backgroundColor: veidneTokens.colors.badgeBg, borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: 400, color: '#FFFFFF' },
  undoToolbar: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    ...shorthands.padding('0', '16px'),
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  undoBtn: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('none'),
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius('4px'),
    fontSize: '13px',
    fontWeight: 500,
    color: '#5E5560',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#E5E7EB' },
  },
  undoBtnDisabled: {
    opacity: 0.4,
    cursor: 'default',
    ':hover': { backgroundColor: 'transparent' },
  },
  demoLoading: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flexGrow: 1, gap: '16px',
  },
  demoLoadingLabel: { fontSize: '15px', color: '#5E5560' },
  libraryLink: {
    fontSize: '15px', lineHeight: '24px', fontWeight: 400, color: '#46529E',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer', padding: '0', marginTop: '16px',
    ':hover': { textDecorationLine: 'underline' },
  },
  // Below 768 the sidebar collapses to a bottom sheet, so the forward action
  // gets its own fixed bar that never hides inside it. The content padding
  // below keeps it from covering document text.
  mobileForwardBar: {
    display: 'none',
    [media.below.md]: {
      display: 'block',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      ...shorthands.padding('10px', '16px', '14px'),
      backgroundColor: '#FFFFFF',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'rgba(26,22,34,.1)',
      boxShadow: '0 -6px 18px -12px rgba(26,22,34,.35)',
    },
  },
  // Follow-up actions inside the generate error toast.
  errorActionBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent', padding: '0', cursor: 'pointer',
    fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#46529E',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  errorActionLink: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#46529E', textDecorationLine: 'underline',
    ':hover': { color: '#5566C4' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
});
