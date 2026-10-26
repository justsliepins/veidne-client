import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('#E5E7EB'),
    ...shorthands.borderRadius('8px'),
    // Width/padding come from the docx metrics (CSS vars) but never exceed the
    // container, so the content reflows to fit and never scrolls horizontally.
    width: 'var(--doc-w, 680px)',
    maxWidth: '100%',
    minHeight: 'var(--doc-h, 960px)',
    paddingTop: 'var(--doc-pt, 64px)',
    paddingBottom: 'var(--doc-pb, 64px)',
    paddingLeft: 'var(--doc-pl, 56px)',
    paddingRight: 'var(--doc-pr, 56px)',
    overflow: 'visible',
    flexShrink: 0,
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
    fontFamily: "'Calibri', 'Segoe UI', sans-serif",
    fontSize: '16px',
    lineHeight: '24px',
    color: '#1A1622',
    overflowWrap: 'break-word',
    wordBreak: 'break-word' as const,
    [media.below.lg]: {
      ...shorthands.padding('40px', '32px'),
      minHeight: '600px',
    },
    [media.below.sm]: {
      ...shorthands.padding('22px', '16px'),
      minHeight: '400px',
      ...shorthands.borderRadius('0'),
      ...shorthands.borderWidth('0'),
      boxShadow: 'none',
    },
    '& p': { ...shorthands.margin('0', '0', '12px', '0') },
    '& strong, & b': { fontWeight: 700 },
    '& em, & i': { fontStyle: 'italic' },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      ...shorthands.margin('12px', '0'),
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      ...shorthands.margin('16px', '0'),
    },
    '& th, & td': {
      ...shorthands.borderStyle('solid'),
      ...shorthands.borderWidth('1px'),
      ...shorthands.borderColor('#E5E7EB'),
      ...shorthands.padding('8px', '12px'),
      textAlign: 'left',
      fontSize: '14px',
    },
    '& th': {
      backgroundColor: '#F9FAFB',
      fontWeight: 600,
    },
  },
});
