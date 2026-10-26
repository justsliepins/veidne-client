import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, minHeight: '0', overflowY: 'auto', ...shorthands.padding('32px', '24px'), ...shorthands.gap('16px'),
    [media.below.sm]: { ...shorthands.padding('16px', '12px') },
  },
  card: {
    maxWidth: '480px', width: '100%', backgroundColor: '#fff', ...shorthands.border('1px', 'solid', '#E2E8F0'), ...shorthands.borderRadius('12px'), ...shorthands.padding('32px'),
    [media.below.sm]: { maxWidth: '100%', ...shorthands.padding('20px') },
  },
  title: { fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#1A1622', marginTop: '0', marginBottom: '16px' },
  fileName: { fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: '#1A1622', display: 'flex', alignItems: 'center', ...shorthands.gap('6px'), marginBottom: '8px' },
  fields: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#6B7280', display: 'flex', flexWrap: 'wrap', alignItems: 'center', ...shorthands.gap('4px'), marginBottom: '4px' },
  chip: { fontSize: '11px', lineHeight: '16px', fontWeight: 500, ...shorthands.padding('1px', '6px'), ...shorthands.borderRadius('4px'), whiteSpace: 'nowrap' as const },
  timestamp: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#6B7280', marginBottom: '20px' },
  actions: { display: 'flex', ...shorthands.gap('12px') },
  btnContinue: { ...shorthands.padding('8px', '20px'), ...shorthands.borderRadius('8px'), ...shorthands.borderStyle('none'), backgroundColor: '#7C3AED', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' } },
  btnFresh: { ...shorthands.padding('8px', '20px'), ...shorthands.borderRadius('8px'), ...shorthands.border('1px', 'solid', '#D1D5DB'), backgroundColor: 'transparent', color: '#4B5563', fontWeight: 600, fontSize: '14px', cursor: 'pointer', ':focus-visible': { outlineColor: '#7C3AED', outlineWidth: '2px', outlineStyle: 'solid', outlineOffset: '2px' } },
  dragHint: { fontSize: '13px', color: '#6B7280', marginTop: '8px' },
});
