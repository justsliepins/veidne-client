import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  overlay: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(9, 9, 11, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: veidneTokens.zIndex.modal,
  },
  card: {
    width: '900px', maxWidth: '95vw', height: ['80vh', '80dvh'], maxHeight: '700px',
    backgroundColor: '#FFFFFF', borderRadius: '16px',
    boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    ...shorthands.padding('24px', '24px', '16px'),
    borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#E8E8F0',
    display: 'flex', flexDirection: 'column', gap: '12px',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: {
    fontSize: '24px', lineHeight: '32px', fontWeight: 700, color: '#1A1622',
  },
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', ...shorthands.padding('0'),
  },
  categoryRow: {
    display: 'flex', flexWrap: 'wrap', gap: '8px',
  },
  categoryChip: {
    ...shorthands.padding('4px', '14px'),
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '16px', backgroundColor: '#FFFFFF',
    fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#5E5560',
    cursor: 'pointer',
    ':hover': { ...shorthands.borderColor('#46529E'), color: '#46529E' },
  },
  categoryChipActive: {
    ...shorthands.padding('4px', '14px'),
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#46529E'),
    borderRadius: '16px', backgroundColor: '#F0F2FF',
    fontSize: '13px', lineHeight: '20px', fontWeight: 600, color: '#46529E',
    cursor: 'pointer',
  },
  content: {
    ...shorthands.padding('24px'),
    ...shorthands.gap('20px'),
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    flexGrow: 1, overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    [media.below.sm]: { ...shorthands.padding('16px'), ...shorthands.gap('12px') },
  },
  empty: {
    width: '100%', textAlign: 'center',
    fontSize: '15px', lineHeight: '24px', color: '#5E5560',
    paddingTop: '48px',
  },

  // Lightbox
  lightboxOverlay: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    zIndex: veidneTokens.zIndex.lightbox,
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: '200ms', animationFillMode: 'forwards',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  lightboxPanel: {
    display: 'flex', flexDirection: 'column',
    // dvh fits the visible viewport (excludes mobile browser chrome) so the
    // pinned action footer below is always reachable. 100vh is the fallback.
    width: '100%', maxWidth: '900px', height: ['100vh', '100dvh'], maxHeight: ['100vh', '100dvh'],
    boxSizing: 'border-box' as const,
    ...shorthands.padding('56px', '64px', '24px'),
    [media.below.lg]: { ...shorthands.padding('48px', '48px', '20px') },
    [media.below.sm]: { ...shorthands.padding('40px', '16px', '16px') },
  },
  lightboxPreviewZone: {
    flexGrow: 1, flexShrink: 1, flexBasis: 'auto',
    minHeight: '100px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  lightboxContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: '85vw',
    position: 'relative',
  },
  lightboxPreview: {
    maxWidth: '100%', maxHeight: '100%',
    objectFit: 'contain' as const,
    ...shorthands.borderRadius('8px'),
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  },
  lightboxInfo: {
    flexGrow: 0, flexShrink: 1, flexBasis: 'auto',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    maxHeight: ['30vh', '30dvh'],
    ...shorthands.padding('16px', '0'),
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    width: '100%', maxWidth: '600px', alignSelf: 'center',
    [media.below.sm]: { maxHeight: ['34vh', '34dvh'] },
  },
  // Pinned action footer: stays put while the preview and info scroll above it.
  lightboxCta: {
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
    paddingTop: '14px',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    display: 'flex', justifyContent: 'center',
    width: '100%', maxWidth: '600px', alignSelf: 'center',
  },
  lightboxNameRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  lightboxName: {
    fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#FFFFFF',
  },
  lightboxCategoryBadge: {
    ...shorthands.padding('2px', '10px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    fontSize: '12px', lineHeight: '18px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)',
  },
  lightboxDescription: {
    fontSize: '14px', lineHeight: '20px', color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const, maxWidth: '100%',
  },
  lightboxFieldsLabel: {
    fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  lightboxFieldsWrap: {
    display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center',
  },
  lightboxFieldChip: {
    ...shorthands.padding('2px', '10px'),
    ...shorthands.borderRadius('4px'),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    fontSize: '12px', lineHeight: '20px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)',
  },
  lightboxMoreFields: {
    ...shorthands.padding('2px', '10px'),
    fontSize: '12px', lineHeight: '20px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.4)',
  },
  lightboxUseBtn: {
    width: '100%', maxWidth: '400px', height: '44px',
    ...shorthands.borderStyle('none'), ...shorthands.borderRadius('8px'),
    backgroundColor: '#5566C4', color: '#FFFFFF',
    fontSize: '15px', lineHeight: '24px', fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    marginTop: '4px',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outline: '2px solid #FFFFFF', outlineOffset: '2px' },
    [media.below.sm]: { maxWidth: 'none' },
  },
  lightboxUseBtnLoading: {
    opacity: 0.7, cursor: 'default',
  },
  lightboxCloseBtn: {
    position: 'fixed', top: '16px', right: '16px',
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#FFFFFF', fontSize: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '40px', height: '40px',
    opacity: 0.7,
    zIndex: veidneTokens.zIndex.lightbox + 1,
    ':hover': { opacity: 1 },
  },
  lightboxArrow: {
    position: 'fixed', top: '50%',
    transform: 'translateY(-50%)',
    zIndex: veidneTokens.zIndex.lightbox + 1,
    width: '48px', height: '48px',
    ...shorthands.borderRadius('24px'),
    ...shorthands.borderStyle('none'),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF', fontSize: '24px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    ':hover': { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
    [media.below.sm]: { width: '36px', height: '36px', ...shorthands.borderRadius('18px'), fontSize: '20px' },
  },
  lightboxArrowLeft: {
    left: '16px',
  },
  lightboxArrowRight: {
    right: '16px',
  },
});
