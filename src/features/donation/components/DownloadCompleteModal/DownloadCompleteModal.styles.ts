import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  // Overlay / card / titleRow / title / closeBtn copied from DonationModal so
  // open/close, backdrop, scroll and z-index behave identically.
  overlay: {
    position: 'fixed', top: '0', left: '0', right: '0',
    height: ['100vh', '100dvh'],
    backgroundColor: 'rgba(9, 9, 11, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: veidneTokens.zIndex.modal,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    [media.below.md]: { alignItems: 'flex-start' },
  },
  // Sized to hold the DonateInline card (max 520px) without the card scrolling
  // internally; on phones the padding tightens so the whole thing fits a
  // 375 by 667 viewport.
  card: {
    width: '560px', boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    borderRadius: '18px',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.06), 0 24px 60px -24px rgba(26, 22, 34, 0.45)',
    padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '16px',
    [media.below.md]: { width: 'min(560px, 95vw)', marginTop: 'auto', marginBottom: 'auto' },
    [media.below.sm]: { width: '95vw', ...shorthands.padding('16px', '12px'), gap: '12px' },
  },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    fontSize: '24px', lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.01em', color: '#1A1622',
    [media.below.sm]: { fontSize: '20px', lineHeight: '28px' },
  },
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', padding: '0',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },

  // Review: one quiet line under the donate card, same tone as ReviewAsk's
  // condensed row.
  reviewRow: {
    fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#767077',
    textAlign: 'center',
  },
  reviewLink: {
    color: '#5566C4', fontWeight: 500, textDecorationLine: 'underline', whiteSpace: 'nowrap',
    ':hover': { color: '#46529E' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },

  // Plain text dismiss at the bottom.
  dismiss: {
    alignSelf: 'center',
    fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#767077',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), cursor: 'pointer',
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline', color: '#5E5560' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
});
