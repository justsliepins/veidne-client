import { makeStyles } from '@fluentui/react-components';

export const useRoadmapColumnStyles = makeStyles({
  column: { maxWidth: '380px', flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' },
  header: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', height: '28px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%' },
  title: { fontSize: '18px', lineHeight: '28px', fontWeight: 600, color: '#1A1622' },
  cards: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
});
