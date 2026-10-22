// Kavach Smart Helmet — Unified Design System Index
import { Platform } from 'react-native';
import { colors, tones, getTone } from './colors.js';
import { typography } from './typography.js';
import { spacing, space, MIN_TOUCH } from './spacing.js';
import { radius, radii } from './radii.js';

export const shadows = {
  sm: Platform.select({
    android: { elevation: 1 },
    default: {
      shadowColor: colors.midnightNavy,
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
  }),
  card: Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: colors.midnightNavy,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
  }),
  hero: Platform.select({
    android: { elevation: 4 },
    default: {
      shadowColor: colors.midnightNavy,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  }),
};

export {
  colors,
  tones,
  getTone,
  typography,
  spacing,
  space,
  MIN_TOUCH,
  radius,
  radii,
};

export default {
  colors,
  tones,
  getTone,
  typography,
  spacing,
  space,
  MIN_TOUCH,
  radius,
  radii,
  shadows,
};
