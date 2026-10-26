import { makeStyles } from '@fluentui/react-components';

// Gentle entrance, gated for reduced motion below.
const fadeIn = {
  from: { opacity: 0, transform: 'translateY(-6px)' },
  to: { opacity: 1, transform: 'none' },
};

export const useStyles = makeStyles({
  // Informational, calm: soft periwinkle surface, never the action fill.
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'rgba(85, 102, 196, 0.10)',
    border: '1px solid rgba(85, 102, 196, 0.22)',
    borderRadius: '999px',
    padding: '8px 8px 8px 14px',
    marginBottom: '14px',
    animationName: fadeIn,
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  icon: { color: '#46529E', fontSize: '16px', flexShrink: 0 },
  text: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 500,
    color: '#1A1622',
  },
  dismiss: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#5E5560',
    cursor: 'pointer',
    flexShrink: 0,
    ':hover': { backgroundColor: 'rgba(26, 22, 34, 0.06)', color: '#1A1622' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
    '@media (max-width: 639px)': { width: '44px', height: '44px' },
  },
});
