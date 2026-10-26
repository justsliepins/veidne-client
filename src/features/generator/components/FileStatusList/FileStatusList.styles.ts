import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

// Persistent file panel per part 5. Collapse rule: 8 files or fewer renders the
// flat list (no header, no scroll window); more than 8 gets the header + toggle
// and a capped scroll window (~8 rows desktop, ~5 on small screens).
export const useStyles = makeStyles({
  panel: {
    marginTop: '24px', textAlign: 'left' as const,
    // Constant width across every phase: full content column up to 540px, so the
    // appearance of the "Converting" tag (and other status changes) lays out
    // inside the panel without resizing it.
    width: '100%', maxWidth: '540px',
    marginLeft: 'auto', marginRight: 'auto',
    ...shorthands.border('1px', 'solid', 'rgba(26, 22, 34, 0.10)'),
    ...shorthands.borderRadius('14px'), overflowX: 'hidden', overflowY: 'hidden',
    position: 'relative' as const,
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    ...shorthands.padding('12px', '16px'),
    backgroundColor: 'rgba(26, 22, 34, 0.025)',
    ...shorthands.borderBottom('1px', 'solid', 'rgba(26, 22, 34, 0.10)'),
  },
  headCollapsed: { ...shorthands.borderBottom('0') },
  title: { fontSize: '14px', fontWeight: 600, color: '#1A1622' },
  count: { color: '#5E5560', fontWeight: 600 },
  toggle: {
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'),
    fontSize: '14px', fontWeight: 600, color: '#46529E', cursor: 'pointer',
    minHeight: '44px', ...shorthands.padding('0', '6px'),
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
  scroll: {
    maxHeight: '272px', overflowY: 'auto', overscrollBehavior: 'contain',
    [media.below.sm]: { maxHeight: '215px' },
  },
  list: {
    listStyleType: 'none', ...shorthands.margin('0'), ...shorthands.padding('0'),
  },
  // Jump to current pill (part 5): anchored bottom-right of the panel, shown only
  // while following is paused. Periwinkle on white text (AA), 44px hit target,
  // visible keyboard focus per the app standard.
  jump: {
    position: 'absolute' as const, right: '12px', bottom: '12px', zIndex: 2,
    minHeight: '44px', ...shorthands.padding('0', '16px'), ...shorthands.borderRadius('999px'),
    backgroundColor: '#5566C4', color: '#FFFFFF', ...shorthands.borderStyle('none'),
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 16px -6px rgba(85, 102, 196, 0.7)',
    transitionProperty: 'background-color', transitionDuration: '0.2s',
    ':hover': { backgroundColor: '#46529E' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
});
