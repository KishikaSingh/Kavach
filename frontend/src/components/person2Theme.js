// Visual tokens for Person 2 screens — unified with global Kavach design system.
import { colors as themeColors, typography as themeType, spacing as themeSpace } from '../theme/index.js';

export const colors = {
  bg: themeColors.background,
  card: themeColors.card,
  cardAlt: themeColors.cardAlt,
  border: themeColors.border,
  text: themeColors.text,
  muted: themeColors.textSecondary,
  primary: themeColors.primary,
  danger: themeColors.emergency,
  warning: themeColors.warning,
  success: themeColors.safetyTeal,
  high: themeColors.emergency,
  medium: themeColors.warning,
  low: themeColors.safetyTeal,
};

export const space = {
  xs: themeSpace.xs,
  sm: themeSpace.sm,
  md: themeSpace.lg,
  lg: themeSpace.xxl,
};

export const type = {
  title: themeType.title,
  subtitle: themeType.subtitle,
  body: themeType.body,
  muted: themeType.supporting,
  label: themeType.label,
};

export default { colors, space, type };
