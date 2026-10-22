// Unified Theme Exports for Kavach Smart Helmet App
import { colors, lightColors, darkColors, tones, getTone } from './colors.js';
import { typography } from './typography.js';
import { spacing, MIN_TOUCH } from './spacing.js';
import { radius } from './radii.js';
import { lightTheme, darkTheme } from './themes.js';
import { ThemeProvider, useTheme, ThemeContext, THEME_STORAGE_KEY } from './ThemeProvider.js';

export const shadows = lightTheme.shadows;

export {
  colors,
  lightColors,
  darkColors,
  typography,
  spacing,
  radius,
  MIN_TOUCH,
  tones,
  getTone,
  lightTheme,
  darkTheme,
  ThemeProvider,
  useTheme,
  ThemeContext,
  THEME_STORAGE_KEY,
};

export default {
  colors,
  typography,
  spacing,
  radius,
  MIN_TOUCH,
  shadows,
  tones,
  getTone,
  lightTheme,
  darkTheme,
};
