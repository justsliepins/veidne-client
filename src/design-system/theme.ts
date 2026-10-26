import type { BrandVariants } from '@fluentui/react-components';
import { createLightTheme, createDarkTheme } from '@fluentui/react-components';

const veidneBrand: BrandVariants = {
  10: '#030408',
  20: '#111627',
  30: '#192346',
  40: '#1F2E5F',
  50: '#253A79',
  60: '#2C4694',
  70: '#46529E',
  80: '#5566C4',
  90: '#95A3E5',
  100: '#ADB8EB',
  110: '#C4CCF1',
  120: '#D9DFF6',
  130: '#ECF0FB',
  140: '#F6F7FD',
  150: '#FBFBFE',
  160: '#FFFFFF',
};

export const veidneLightTheme = {
  ...createLightTheme(veidneBrand),
  // Brandbook color roles (single source of truth for the action periwinkle).
  // Action fill: white text on it passes WCAG AA (~5:1).
  colorBrandBackground: '#5566C4',
  colorBrandBackgroundHover: '#46529E',
  colorBrandBackgroundPressed: '#3F4E9C',
  // Periwinkle text / accent / icons: the darker AA shade, never the fill.
  colorBrandForeground1: '#46529E',
  colorBrandForeground2: '#46529E',
  colorCompoundBrandForeground1: '#46529E',
  colorCompoundBrandForeground1Hover: '#3F4E9C',
  colorBrandStroke1: '#5566C4',
  // Brandbook neutrals.
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground2: '#FAFBFF',
  colorNeutralForeground1: '#1A1622', // ink
  colorNeutralForeground2: '#5E5560', // muted
  colorNeutralForeground3: '#767077', // faint
  colorNeutralStroke1: '#E8E8F0',
  colorPaletteGreenForeground1: '#3EC98A',
  colorPaletteYellowForeground1: '#E8A13A',
};

export const veidneDarkTheme = {
  ...createDarkTheme(veidneBrand),
  colorNeutralBackground1: '#09090B',
  colorNeutralBackground2: '#111113',
  colorNeutralForeground1: '#FAFAFA',
  colorNeutralForeground2: '#A1A1AA',
  colorNeutralStroke1: '#27272A',
};
