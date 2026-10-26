import { makeStyles, shorthands } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';

export const useStyles = makeStyles({
  root: {
    width: '100%',
    maxWidth: '332px',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderColor('#E8E8F0'),
    boxShadow: veidneTokens.shadows.cardLight,
    borderRadius: '4px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  text: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#1A1622' },
  highlight: {
    padding: '2px 4px',
    backgroundColor: veidneTokens.colors.previewHighlight,
    borderRadius: '2px',
    fontWeight: 500,
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
  },
  emptyValue: {
    padding: '2px 4px',
    color: '#9CA3AF',
    transitionProperty: 'opacity, transform',
    transitionDuration: '400ms',
    transitionTimingFunction: 'ease',
  },
  revealing: {
    opacity: 0,
    transform: 'translateY(4px)',
  },
});
