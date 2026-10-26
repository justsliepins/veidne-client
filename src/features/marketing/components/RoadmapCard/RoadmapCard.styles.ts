import { makeStyles } from '@fluentui/react-components';

export const useRoadmapCardStyles = makeStyles({
  card: {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    border: '1px solid rgba(26, 22, 34, 0.06)',
    borderRadius: '16px', padding: '20px', gap: '12px',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.04), 0 14px 34px -18px rgba(60, 50, 70, 0.22)',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  },
  staticCard: {},
  votableCard: {},
  title: { fontSize: '15px', lineHeight: '24px', fontWeight: 600, color: '#1A1622', overflowWrap: 'anywhere' as const },
  description: { fontSize: '13px', lineHeight: '20px', fontWeight: 400, color: '#5E5560', overflowWrap: 'anywhere' as const },
  voteBtn: {
    minWidth: 'auto', height: '32px',
    paddingTop: '6px', paddingBottom: '6px', paddingLeft: '12px', paddingRight: '12px',
    borderRadius: '6px', fontSize: '13px', lineHeight: '20px', fontWeight: 600,
    color: '#FFFFFF', borderTopStyle: 'none', borderRightStyle: 'none',
    borderBottomStyle: 'none', borderLeftStyle: 'none',
  },
  unvoted: { backgroundColor: '#5566C4' },
  voted: { backgroundColor: '#22C55E' },
});
