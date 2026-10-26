import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  root: {
    position: 'absolute' as const,
    right: '0',
    top: '0',
    bottom: '0',
    width: '280px',
    backgroundColor: '#FFFFFF',
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftColor: '#E8E8F0',
    padding: '20px 16px',
    overflowY: 'auto',
    zIndex: 10,
    transitionProperty: 'transform',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
    [media.below.lg]: {
      width: '240px',
    },
    // Mobile: a docked, non-covering panel. Collapsed it is a slim bar showing
    // the field count; expanded it grows upward to the scrollable list. It never
    // hides the document, so fields accumulate while the user reads and taps.
    [media.below.md]: {
      position: 'fixed' as const,
      left: '0',
      right: '0',
      // Rise above the soft keyboard when a field is being renamed inline,
      // and above the fixed forward bar when the Editor renders one.
      bottom: 'calc(var(--kb-inset, 0px) + var(--forward-bar-inset, 0px))',
      top: 'auto',
      width: '100%',
      height: 'auto',
      maxHeight: ['62vh', '62dvh'],
      padding: '0',
      borderLeftStyle: 'none',
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      borderTopColor: '#E8E8F0',
      borderTopLeftRadius: '16px',
      borderTopRightRadius: '16px',
      boxShadow: '0 -6px 20px rgba(26, 22, 34, 0.12)',
      zIndex: veidneTokens.zIndex.dockedBar,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'hidden',
    },
  },
  collapsed: {
    transform: 'translateX(100%)',
    // On mobile the bar stays docked; only the list/CTA collapse away.
    [media.below.md]: {
      transform: 'none',
    },
  },
  // Hide the list and CTA on mobile when collapsed (slim-bar state).
  collapsedHideMobile: {
    [media.below.md]: { display: 'none' },
  },
  toggle: {
    position: 'absolute' as const, right: '280px',
    top: '50%',
    transform: 'translateY(-50%)', zIndex: 11, backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '6px 0 0 6px', borderRightStyle: 'none',
    padding: '8px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    transitionProperty: 'right', transitionDuration: '200ms',
    [media.below.lg]: {
      right: '240px',
    },
    // Mobile uses the docked bar's own header as the toggle, so hide the FAB.
    [media.below.md]: {
      display: 'none',
    },
  },
  toggleCollapsed: {
    right: '0',
    [media.below.md]: {
      right: '16px',
    },
  },

  chevronIcon: {
    display: 'flex',
    alignItems: 'center',
    [media.below.md]: { display: 'none' },
  },
  fabIcon: {
    display: 'none',
    [media.below.md]: { display: 'flex', alignItems: 'center' },
  },
  fabBadge: {
    display: 'none',
    [media.below.md]: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute' as const,
      top: '-4px',
      right: '-4px',
      minWidth: '20px',
      height: '20px',
      borderRadius: '10px',
      backgroundColor: '#E8475F',
      color: '#FFFFFF',
      fontSize: '11px',
      fontWeight: 700,
      paddingLeft: '4px',
      paddingRight: '4px',
    },
  },

  // Backdrop: only visible on mobile when sidebar is open
  // The docked panel does not cover the document, so there is no backdrop.
  backdrop: {
    display: 'none',
  },
  backdropOpen: {},

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
    width: '100%', flexShrink: 0,
    fontSize: '14px', fontWeight: 600, color: '#1A1622',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '16px',
    border: 'none', backgroundColor: 'transparent', fontFamily: 'inherit', textAlign: 'left',
    padding: '0', cursor: 'default',
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '-2px', borderRadius: '4px' },
    // On mobile the header is the tappable slim bar that toggles the panel.
    [media.below.md]: {
      cursor: 'pointer', minHeight: '52px', marginBottom: '0',
      paddingLeft: '16px', paddingRight: '16px',
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
    },
  },
  headerChevron: {
    display: 'none',
    [media.below.md]: { display: 'flex', alignItems: 'center', color: '#5E5560', flexShrink: 0 },
  },
  fieldList: {
    [media.below.md]: {
      flexGrow: 1,
      overflowY: 'auto',
      minHeight: '0',
      // Keep momentum scroll inside the bar; don't chain to the document.
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
      paddingLeft: '12px', paddingRight: '12px', paddingBottom: '8px',
    },
  },
  item: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
    ':hover': { backgroundColor: '#FAFBFF' },
    // Reveal the per-row controls on hover or keyboard focus; hide the count
    // behind them so the list stays clean and the width never shifts.
    '&:hover [data-row-actions]': { opacity: 1, pointerEvents: 'auto' },
    '&:focus-within [data-row-actions]': { opacity: 1, pointerEvents: 'auto' },
    '&:hover [data-row-count]': { opacity: 0 },
    '&:focus-within [data-row-count]': { opacity: 0 },
  },
  itemActive: { backgroundColor: '#FAFBFF' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  name: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#1A1622',
    flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    textAlign: 'left', border: 'none', backgroundColor: 'transparent', padding: '0',
    fontFamily: 'inherit', cursor: 'text',
    ':hover': { textDecorationLine: 'underline', textDecorationColor: 'rgba(26,22,34,.3)' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px', borderRadius: '2px' },
  },
  count: {
    fontSize: '14px', color: '#5E5560', flexShrink: 0,
    transitionProperty: 'opacity', transitionDuration: '0.15s',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  editInput: {
    flexGrow: 1, minWidth: 0,
    fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#1A1622',
    fontFamily: 'inherit',
    padding: '2px 6px', borderRadius: '4px',
    borderTop: '1.5px solid rgba(85,102,196,.5)', borderRight: '1.5px solid rgba(85,102,196,.5)',
    borderBottom: '1.5px solid rgba(85,102,196,.5)', borderLeft: '1.5px solid rgba(85,102,196,.5)',
    backgroundColor: '#FFFFFF', outlineStyle: 'none',
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '1px' },
  },
  actions: {
    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center', gap: '2px',
    opacity: 0, pointerEvents: 'none',
    transitionProperty: 'opacity', transitionDuration: '0.15s',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
    // Mobile has no hover, so the controls sit inline and are always available.
    [media.below.md]: {
      position: 'static', transform: 'none', opacity: 1, pointerEvents: 'auto', flexShrink: 0,
    },
  },
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '6px',
    border: 'none', backgroundColor: 'transparent', color: '#5E5560', cursor: 'pointer',
    ':hover': { backgroundColor: 'rgba(26,22,34,.06)', color: '#1A1622' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
    [media.below.md]: { width: '44px', height: '44px' },
  },
  // Rename is the affirmative action, so it carries the periwinkle accent on hover.
  iconBtnEdit: { ':hover': { backgroundColor: 'rgba(85,102,196,.12)', color: '#46529E' } },
  empty: { textAlign: 'center', padding: '28px 16px', color: '#5E5560', fontSize: '13px', lineHeight: '20px' },
  ctaWrapper: {
    position: 'sticky', bottom: '0', padding: '16px',
    backgroundColor: '#FFFFFF',
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    borderTopColor: '#E8E8F0',
    [media.below.md]: {
      position: 'static' as const,
      flexShrink: 0,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
      ...shorthands.padding('12px', '16px'),
    },
  },
});
