import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';
import { veidneTokens } from '@/design-system/tokens';

export const useConsentBannerStyles = makeStyles({
  // Fixed to the bottom edge and not modal (PD-11): the page stays usable and
  // nothing shifts when it appears (FB-05). PageLayout reserves its height at
  // the end of the page, so it never covers the last content or a focused
  // element for good (WCAG 2.4.11).
  root: {
    position: 'fixed', left: '0', right: '0', bottom: '0',
    // Never more than half the screen (a phone held sideways, 400 % zoom):
    // the text scrolls inside, the two buttons always stay visible.
    maxHeight: ['50vh', '50dvh'], display: 'flex', flexDirection: 'column',
    zIndex: veidneTokens.zIndex.consent,
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #D6D3DC',
    boxShadow: '0px -4px 24px rgba(0, 0, 0, 0.10)',
    paddingTop: '16px',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'max(24px, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(24px, env(safe-area-inset-right, 0px))',
    [media.below.sm]: {
      paddingTop: '12px',
      paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
      paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
    },
  },
  inner: {
    width: '100%', maxWidth: '1120px', marginLeft: 'auto', marginRight: 'auto',
    minHeight: '0', flexGrow: 1, flexShrink: 1,
    display: 'flex', alignItems: 'center', gap: '24px',
    [media.below.md]: { flexDirection: 'column', alignItems: 'stretch', gap: '12px' },
  },
  text: {
    display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0', minHeight: '0', flexGrow: 1, flexShrink: 1,
    maxHeight: '100%', overflowY: 'auto',
  },
  heading: {
    margin: '0', fontSize: '17px', lineHeight: '24px', fontWeight: 700, color: '#1A1622',
    [media.below.sm]: { fontSize: '16px', lineHeight: '22px' },
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
  },
  body: {
    margin: '0', fontSize: '15px', lineHeight: '22px', color: '#3F3A45', maxWidth: '75ch',
    [media.below.sm]: { fontSize: '14px', lineHeight: '20px' },
  },
  link: {
    color: '#46529E', textDecorationLine: 'underline', textUnderlineOffset: '2px',
    ':hover': { color: '#2F3A80' },
    ':focus-visible': { outline: '2px solid #5566C4', outlineOffset: '2px' },
  },
  // Two buttons of the same size, colour and weight: refusing is as easy and
  // as visible as allowing (CTA-23, CTA-27).
  srOnly: {
    position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
    overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', ...shorthands.borderWidth('0'),
  },
  actions: {
    display: 'flex', gap: '12px', flexShrink: 0,
    [media.below.md]: { width: '100%' },
  },
  choice: {
    minHeight: '44px', minWidth: '160px', paddingLeft: '20px', paddingRight: '20px',
    ...shorthands.borderStyle('solid'), ...shorthands.borderWidth('1px'), ...shorthands.borderColor('#46529E'),
    borderRadius: '8px', backgroundColor: '#46529E', color: '#FFFFFF',
    fontSize: '15px', lineHeight: '20px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
    ':hover': { backgroundColor: '#2F3A80', ...shorthands.borderColor('#2F3A80') },
    ':focus-visible': { outline: '2px solid #1A1622', outlineOffset: '2px' },
    [media.below.md]: { flexGrow: 1, flexBasis: '0', minWidth: '0', minHeight: '48px' },
  },
});
