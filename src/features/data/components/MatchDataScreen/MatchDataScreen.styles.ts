import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1, ...shorthands.padding('48px', '24px'),
    // Own scroll region at every width: the fixed-height editor shell clips a
    // vertically-centered column, so a tall column-chip header pushes the choice
    // cards out of reach. Top-align here (centered flex + overflow hides the top)
    // and let the inner content's auto block margins keep it visually centered
    // when it fits, scrolling naturally from the top when it overflows.
    overflowY: 'auto',
    minHeight: 0,
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    [media.below.md]: {
      paddingTop: '32px', paddingBottom: '40px',
    },
  },
  // Auto block margins center the block when it fits and collapse to 0 on
  // overflow so the whole thing scrolls from the top.
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
    marginTop: 'auto', marginBottom: 'auto',
  },
  header: { textAlign: 'center' as const, maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: '#1A1622', lineHeight: '28px' },
  chipsWrap: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' },
  chip: { ...shorthands.padding('2px', '8px'), ...shorthands.borderRadius('6px'), backgroundColor: 'rgba(85, 102, 196, 0.12)', fontSize: '12px', fontWeight: 500, color: '#46529E' },
  moreChip: { ...shorthands.padding('2px', '8px'), fontSize: '12px', fontWeight: 500, color: '#5E5560' },
  rowCount: { fontSize: '14px', color: '#5E5560' },
  cards: {
    display: 'flex', gap: '24px', justifyContent: 'center',
    [media.below.md]: {
      flexWrap: 'wrap' as const,
      gap: '16px',
    },
  },
  card: {
    width: '280px', ...shorthands.padding('32px', '28px'),
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('rgba(26, 22, 34, 0.06)'),
    ...shorthands.borderRadius('18px'), cursor: 'pointer', textAlign: 'left' as const,
    display: 'flex', flexDirection: 'column', gap: '8px',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.04), 0 14px 34px -18px rgba(60, 50, 70, 0.22)',
    transitionProperty: 'transform, border-color, box-shadow', transitionDuration: '0.2s', transitionTimingFunction: 'ease',
    ':hover': { transform: 'translateY(-3px)', ...shorthands.borderColor('rgba(85, 102, 196, 0.45)'), boxShadow: '0 2px 4px rgba(60, 50, 70, 0.05), 0 22px 46px -20px rgba(60, 50, 70, 0.28)' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none', ':hover': { transform: 'none' } },
    [media.below.md]: {
      width: '100%',
      maxWidth: '320px',
    },
  },
  cardPrimary: {
    ...shorthands.borderColor('#46529E'),
  },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#1A1622' },
  cardSub: { fontSize: '13px', color: '#5E5560', lineHeight: '20px' },
  hiddenInput: { display: 'none' },
  backLink: {
    fontSize: '13px', color: '#46529E', cursor: 'pointer',
    backgroundColor: 'transparent', ...shorthands.borderStyle('none'), ...shorthands.padding('0'),
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { outlineColor: '#5566C4', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' },
  },
});
