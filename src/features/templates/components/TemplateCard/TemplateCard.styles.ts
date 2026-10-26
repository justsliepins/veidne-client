import { makeStyles, shorthands } from '@fluentui/react-components';

// Calm shimmer for the loading skeleton (gated for reduced motion below).
const shimmer = {
  '0%': { backgroundPositionX: '100%' },
  '100%': { backgroundPositionX: '0%' },
};

export const useStyles = makeStyles({
  root: {
    flex: '1 1 200px',
    maxWidth: '280px',
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    padding: '0',
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '8px', cursor: 'pointer', overflow: 'hidden',
    fontFamily: 'inherit',
    transitionProperty: 'border-color',
    transitionDuration: '0.15s',
    ':hover': { ...shorthands.borderColor('#46529E') },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  preview: {
    position: 'relative',
    // Consistent aspect-ratio box so every thumbnail frames the same way,
    // regardless of card width (no per-card squashing or odd cropping).
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: '#FAFBFF',
    overflow: 'hidden',
  },

  // Always-present neutral document motif, so a card is never blank or broken.
  placeholder: {
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '10px', ...shorthands.padding('16px'),
    backgroundColor: '#FAFBFF',
  },
  page: {
    width: '58px', height: '76px', flexShrink: 0,
    backgroundColor: '#FFFFFF',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#E8E8F0'),
    borderRadius: '4px',
    ...shorthands.padding('9px', '8px'),
    display: 'flex', flexDirection: 'column', gap: '5px',
    boxShadow: '0 1px 3px rgba(26, 22, 34, 0.06)',
  },
  line: { height: '4px', borderRadius: '2px', backgroundColor: '#E5E7EB' },
  lineTitle: { backgroundColor: '#CBD0DA', width: '72%' },
  lineShort: { width: '55%' },
  placeholderName: {
    fontSize: '12px', lineHeight: '16px', fontWeight: 500, color: '#5E5560',
    textAlign: 'center', maxWidth: '100%',
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },

  skeleton: {
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
    backgroundColor: '#F0F1F5',
    backgroundImage: 'linear-gradient(90deg, rgba(240,241,245,0) 20%, rgba(225,228,237,0.9) 50%, rgba(240,241,245,0) 80%)',
    backgroundSize: '300% 100%',
    animationName: shimmer,
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },

  previewImg: {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'top center',
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '0.3s',
    transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  previewImgLoaded: { opacity: 1 },

  info: { ...shorthands.padding('8px', '12px') },
  name: {
    fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#1A1622',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
});
