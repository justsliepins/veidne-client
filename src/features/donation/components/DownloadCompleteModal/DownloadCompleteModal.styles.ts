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
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: {
    margin: '0', outlineStyle: 'none',
    fontSize: '24px', lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.01em', color: '#1A1622',
    [media.below.sm]: { fontSize: '20px', lineHeight: '28px' },
  },
  closeBtn: {
    ...shorthands.borderStyle('none'), backgroundColor: 'transparent',
    cursor: 'pointer', color: '#5E5560', fontSize: '24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0',
    width: '44px', height: '44px', marginRight: '-10px', marginTop: '-6px', borderRadius: '10px',
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },

  saved: {
    '& svg': { flexShrink: 0 },
    display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px',
    fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#166534',
  },
  // Declining has the same size and weight class as the Donate button above
  // (CTA-23): a full-width secondary button, not small grey text.
  dismiss: {
    alignSelf: 'stretch', minHeight: '48px',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.18)'),
    borderRadius: '11px',
    fontSize: '15px', fontWeight: 600, color: '#1A1622', cursor: 'pointer',
    ':hover': { ...shorthands.borderColor('#1A1622') },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
});
