import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';

const PERIWINKLE_INK = '#46529E';
const BORDER = '#E8E8F0';

export const useStyles = makeStyles({
  card: {
    marginLeft: '20px',
    marginRight: '20px',
    marginBottom: '4px',
    ...shorthands.padding('14px', '16px'),
    backgroundColor: '#FAFBFF',
    ...shorthands.border('1px', 'solid', BORDER),
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  title: { fontSize: '14px', fontWeight: 600, color: '#1A1622' },
  label: { fontSize: '12px', fontWeight: 600, color: '#5E5560' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  dropdown: { width: '100%', minWidth: '0' },

  advancedToggle: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('none'),
    ...shorthands.padding('0'),
    fontSize: '13px',
    fontWeight: 600,
    color: PERIWINKLE_INK,
    cursor: 'pointer',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: '#5566C4', outlineOffset: '2px' },
  },
  chev: {
    transitionProperty: 'transform',
    transitionDuration: '150ms',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  chevOpen: { transform: 'rotate(180deg)' },

  reveal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    animationName: {
      from: { opacity: 0, transform: 'translateY(-4px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '150ms',
    animationTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none', animationDuration: '0s' },
  },

  warning: {
    display: 'flex',
    gap: '8px',
    ...shorthands.padding('10px', '12px'),
    backgroundColor: veidneTokens.colors.fieldHighlight,
    ...shorthands.border('1px', 'solid', '#F0E2B6'),
    borderRadius: '8px',
  },
  warnIcon: { color: '#B7791F', flexShrink: 0, marginTop: '1px' },
  warnBody: { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '0' },
  warnText: { fontSize: '12px', lineHeight: '18px', color: '#5E4A1A' },
  radioRow: { display: 'flex', flexDirection: 'column', gap: '2px' },
  note: { fontSize: '11px', lineHeight: '16px', color: '#5E5560', fontStyle: 'italic' },

  previewBlock: { display: 'flex', flexDirection: 'column', gap: '5px' },
  previewLabel: { fontSize: '12px', fontWeight: 600, color: '#5E5560' },
  previewList: {
    listStyleType: 'none',
    ...shorthands.margin('0'),
    ...shorthands.padding('0'),
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  previewItem: {
    fontSize: '13px',
    color: PERIWINKLE_INK,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    wordBreak: 'break-all',
  },
  moreLine: { fontSize: '12px', color: '#5E5560' },
});
