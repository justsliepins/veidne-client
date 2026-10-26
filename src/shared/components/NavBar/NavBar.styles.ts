import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { veidneTokens } from '@/design-system/tokens';
import { media } from '@/design-system/responsive';

export const useNavBarStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    height: veidneTokens.layout.navHeight,
    paddingTop: veidneTokens.layout.navVerticalPadding,
    paddingBottom: veidneTokens.layout.navVerticalPadding,
    paddingLeft: veidneTokens.layout.navHorizontalPadding,
    paddingRight: veidneTokens.layout.navHorizontalPadding,
    [media.below.md]: {
      height: veidneTokens.layoutMobile.navHeight,
      paddingTop: '0',
      paddingBottom: '0',
      paddingLeft: veidneTokens.layoutMobile.navHorizontalPadding,
      paddingRight: veidneTokens.layoutMobile.navHorizontalPadding,
    },
  },
  light: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  dark: {
    backgroundColor: '#09090B',
    borderBottom: '1px solid #27272A',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    marginLeft: 'auto',
    [media.below.lg]: { display: 'none' },
  },
  // Editor header: minimal, no marketing nav. Actions stay visible at every
  // breakpoint (no hamburger drawer).
  editorActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginLeft: 'auto',
  },
  link: { textDecorationLine: 'none', fontSize: '15px', lineHeight: '24px', fontWeight: 400 },
  linkLight: { color: tokens.colorNeutralForeground2 },
  linkDark: { color: '#A1A1AA' },
  linkBtn: { ...shorthands.borderStyle('none'), backgroundColor: 'transparent', padding: '0', cursor: 'pointer' },

  // Mobile hamburger — hidden at md+
  hamburger: {
    display: 'none',
    marginLeft: 'auto',
    width: '44px',
    height: '44px',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('none'),
    cursor: 'pointer',
    ...shorthands.borderRadius('8px'),
    [media.below.lg]: { display: 'flex' },
  },
  hamburgerLight: { color: tokens.colorNeutralForeground1 },
  hamburgerDark: { color: '#FAFAFA' },

  // Backdrop behind drawer
  backdrop: {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: veidneTokens.zIndex.backdrop,
    opacity: 0,
    pointerEvents: 'none' as const,
    transitionProperty: 'opacity',
    transitionDuration: '300ms',
    transitionTimingFunction: 'ease',
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  backdropOpen: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },

  // Slide-in drawer
  drawer: {
    position: 'fixed' as const,
    top: '0',
    right: '0',
    bottom: '0',
    width: '280px',
    zIndex: veidneTokens.zIndex.modal,
    display: 'flex',
    flexDirection: 'column' as const,
    ...shorthands.padding('16px'),
    transform: 'translateX(100%)',
    transitionProperty: 'transform',
    transitionDuration: '300ms',
    transitionTimingFunction: 'ease',
    boxShadow: veidneTokens.shadows.modal,
    '@media (prefers-reduced-motion: reduce)': { transitionProperty: 'none' },
  },
  drawerLight: { backgroundColor: tokens.colorNeutralBackground1 },
  drawerDark: { backgroundColor: '#09090B' },
  drawerOpen: { transform: 'translateX(0)' },

  // Close button in drawer
  drawerClose: {
    alignSelf: 'flex-end',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...shorthands.borderStyle('none'),
    cursor: 'pointer',
    ...shorthands.borderRadius('8px'),
    marginBottom: '8px',
  },
  drawerCloseLight: { color: tokens.colorNeutralForeground1 },
  drawerCloseDark: { color: '#FAFAFA' },

  // Stacked drawer links
  drawerNav: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flexGrow: 1,
  },
  drawerLink: {
    textDecorationLine: 'none',
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 400,
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px',
    paddingRight: '16px',
    ...shorthands.borderRadius('8px'),
    ...shorthands.borderStyle('none'),
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  drawerLinkLight: { color: tokens.colorNeutralForeground2 },
  drawerLinkDark: { color: '#A1A1AA' },

  // Full-width CTA at drawer bottom
  drawerCta: {
    marginTop: 'auto',
    paddingTop: '16px',
    paddingBottom: '16px',
  },
  drawerCtaLink: {
    textDecorationLine: 'none',
    display: 'block',
  },
  drawerCtaBtn: {
    width: '100%',
  },
});
