import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';

// Row anatomy per part 5: status dot, name stem + extension span, right tag.
// Greens are the AA #15803D per ruling 10; the failed row uses the error token
// (ruling 2). Statuses are icon + label + color, never color alone (sr-only text
// + tag carry the meaning too).
export const useStyles = makeStyles({
  // The list item is only the border; the inner element (a button when the
  // row downloads, a div otherwise) carries the 50px row.
  row: {
    ...shorthands.borderBottom('1px', 'solid', 'rgba(26, 22, 34, 0.10)'),
    ':last-child': { ...shorthands.borderBottom('0') },
  },
  rowFailed: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  inner: {
    display: 'flex', alignItems: 'center', gap: '12px',
    width: '100%', height: '50px', boxSizing: 'border-box',
    ...shorthands.padding('0', '14px'),
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'),
    fontSize: '14px', fontFamily: 'inherit', color: '#1A1622', textAlign: 'left',
  },
  // A row that downloads: pointer, lighter background on hover, and the arrow
  // takes the brand colour.
  innerClickable: {
    cursor: 'pointer',
    ':hover': { backgroundColor: '#F3F3F8' },
    ':hover svg:last-child': { color: '#4F52B2' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#4F52B2', outlineOffset: '-2px' },
  },
  docGlyph: { width: '20px', height: '20px', flexShrink: 0, color: '#2B579A' },
  pdfGlyph: { width: '20px', height: '20px', flexShrink: 0, color: '#C4314B' },
  size: { fontSize: '13px', color: '#8A8A94', flexShrink: 0 },
  downloadGlyph: {
    width: '18px', height: '18px', flexShrink: 0, color: '#8A8A94',
    ':hover': { color: '#4F52B2' },
  },
  icon: {
    width: '14px', height: '14px', ...shorthands.borderRadius('50%'),
    flexShrink: 0, position: 'relative' as const,
  },
  iconWaiting: {
    ...shorthands.border('2px', 'solid', 'rgba(26, 22, 34, 0.18)'),
  },
  iconConverting: {
    ...shorthands.border('2px', 'solid', 'rgba(85, 102, 196, 0.14)'),
    borderTopColor: '#5566C4',
    animationName: { to: { transform: 'rotate(360deg)' } },
    animationDuration: '0.8s', animationIterationCount: 'infinite', animationTimingFunction: 'linear',
    // Reduced motion: a solid periwinkle dot instead of a spinning ring.
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none', ...shorthands.borderStyle('none'), backgroundColor: '#5566C4',
    },
  },
  iconFailed: {
    backgroundColor: veidneTokens.colors.error,
    '::after': {
      content: '"!"', position: 'absolute', left: '0', top: '-1px', width: '14px',
      textAlign: 'center', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, lineHeight: '15px',
    },
  },
  name: {
    flexGrow: 1, minWidth: 0, overflowX: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    color: '#1A1622',
  },
  nameWaiting: { color: '#5E5560' },
  ext: { color: '#767077' },
  extDone: { color: '#15803D' },
  tag: { fontSize: '12px', fontWeight: 600, flexShrink: 0 },
  tagConverting: { color: '#46529E' },
  tagFailed: { color: veidneTokens.colors.error },
  srOnly: {
    position: 'absolute', width: '1px', height: '1px',
    ...shorthands.padding('0'), ...shorthands.margin('-1px'),
    overflowX: 'hidden', overflowY: 'hidden',
    clipPath: 'inset(50%)', whiteSpace: 'nowrap', ...shorthands.borderStyle('none'),
  },
});
