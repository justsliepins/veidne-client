import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  surface: {
    maxWidth: '460px',
    width: 'calc(100vw - 32px)',
    ...shorthands.padding('24px'),
    borderRadius: '14px',
    [media.below.sm]: { ...shorthands.padding('18px', '16px') },
  },
  title: { margin: '0 0 12px', fontSize: '18px', fontWeight: 600, color: '#1A1622', wordBreak: 'break-word' },
  text: { margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5, color: '#1A1622', wordBreak: 'break-word' },
  tag: {
    fontFamily: 'monospace',
    fontSize: '13px',
    ...shorthands.padding('1px', '5px'),
    borderRadius: '4px',
    backgroundColor: '#F3F0F5',
  },
  buttonRow: { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '10px', marginTop: '16px' },
});
