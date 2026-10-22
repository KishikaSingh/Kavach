// Kavach Theme Definitions: Light and Dark Themes
import { lightColors, darkColors } from './colors.js';
import { typography } from './typography.js';
import { spacing, MIN_TOUCH } from './spacing.js';
import { radius } from './radii.js';

export const lightTheme = {
  isDark: false,
  colors: lightColors,
  typography,
  spacing,
  radius,
  MIN_TOUCH,
  shadows: {
    none: {},
    sm: {
      shadowColor: '#101B2D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#101B2D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    hero: {
      shadowColor: '#101B2D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export const darkTheme = {
  isDark: true,
  colors: darkColors,
  typography,
  spacing,
  radius,
  MIN_TOUCH,
  shadows: {
    none: {},
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
    hero: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};
