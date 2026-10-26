import { makeStyles } from '@fluentui/react-components';

export const useFeatureCardStyles = makeStyles({
  // Layered-depth card on a near-white vertical gradient; height follows content
  // but fills the grid cell so a row reads as equal-height with balanced padding.
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: '20px',
    padding: '34px 30px',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF, #FCFCFF)',
    border: '1px solid rgba(26, 22, 34, 0.06)',
    boxShadow: '0 1px 2px rgba(60, 50, 70, 0.04), 0 14px 34px -18px rgba(60, 50, 70, 0.22)',
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '0.22s',
    transitionTimingFunction: 'ease',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 2px 4px rgba(60, 50, 70, 0.05), 0 22px 46px -20px rgba(60, 50, 70, 0.28)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transitionProperty: 'none',
      ':hover': { transform: 'none' },
    },
  },
  // Finished icon tile: soft periwinkle gradient, thin ring, gentle glow + inner highlight.
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '54px',
    height: '54px',
    borderRadius: '15px',
    color: '#5566C4',
    backgroundImage: 'linear-gradient(140deg, #E8EAFB, #F3F4FD)',
    border: '1px solid rgba(85, 102, 196, 0.16)',
    boxShadow: '0 6px 14px -6px rgba(85, 102, 196, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
  },
  icon: { color: '#5566C4', fontSize: '25px' },
  title: {
    fontSize: '20px',
    lineHeight: '28px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: '#1A1622',
    marginTop: '22px',
  },
  description: {
    fontSize: '15px',
    lineHeight: 1.62,
    color: '#5E5560',
    marginTop: '10px',
  },
});
