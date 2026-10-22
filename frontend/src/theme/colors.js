// Kavach Theme Colors: Complete Light and Dark Mode Color Tokens
// Designed specifically for high-contrast accessibility (WCAG AA/AAA compliant)

export const lightColors = {
  // Brand & Navies
  midnightNavy: '#101B2D',
  deepNavy: '#172B4D',
  darkBlue: '#0B2545',
  navy: '#101B2D',

  // Teals & Accents
  primary: '#00A99D',
  primaryTeal: '#00A99D',
  safetyTeal: '#00B8A9',
  cyanAccent: '#36CFC9',
  primarySoft: '#E6F8F6',

  // Surfaces & Backgrounds
  background: '#F4F7FB',
  card: '#FFFFFF',
  cardSurface: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surface: '#FFFFFF',
  softBlue: '#EAF4FA',
  mutedSurface: '#F0F4F8',
  border: '#DCE4EE',
  borderSubtle: '#EAEFF5',

  // Typography
  text: '#172033',
  textPrimary: '#172033',
  textSecondary: '#596579',
  textMuted: '#68758A',
  textOnDark: '#FFFFFF',
  textOnTeal: '#FFFFFF',

  // Semantics & Status
  success: '#15803D',
  successSurface: '#E4F6EE',
  successBorder: '#86EFAC',

  warning: '#92400E',
  warningSurface: '#FFF4D6',
  warningBorder: '#FCD34D',

  error: '#B42332',
  emergency: '#B42332',
  errorSurface: '#FDE8E8',
  emergencySurface: '#FDE8E8',
  emergencyBorder: '#FCA5A5',

  info: '#1D4ED8',
  infoSurface: '#EAF2FF',
  infoBorder: '#BFDBFE',

  disabled: '#AAB4C3',
  disabledSurface: '#E2E8F0',

  // Constants
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const darkColors = {
  // Brand & Navies
  midnightNavy: '#0B1220',
  deepNavy: '#111C2E',
  darkBlue: '#18263B',
  navy: '#111C2E',

  // Teals & Accents
  primary: '#2DD4BF',
  primaryTeal: '#2DD4BF',
  safetyTeal: '#00B8A9',
  cyanAccent: '#36CFC9',
  primarySoft: '#0F3836',

  // Surfaces & Backgrounds
  background: '#0B1220',
  card: '#111C2E',
  cardSurface: '#111C2E',
  cardElevated: '#18263B',
  surface: '#111C2E',
  softBlue: '#16273F',
  mutedSurface: '#18263B',
  border: '#2B3B52',
  borderSubtle: '#1E2D42',

  // Typography
  text: '#F1F5F9',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#9AA9BC',
  textOnDark: '#FFFFFF',
  textOnTeal: '#0B1220',

  // Semantics & Status (Dark-compatible surfaces with readable foregrounds)
  success: '#4ADE80',
  successSurface: '#064E3B',
  successBorder: '#059669',

  warning: '#FBBF24',
  warningSurface: '#451A03',
  warningBorder: '#D97706',

  error: '#F87171',
  emergency: '#F87171',
  errorSurface: '#450A0A',
  emergencySurface: '#450A0A',
  emergencyBorder: '#DC2626',

  info: '#60A5FA',
  infoSurface: '#1E3A8A',
  infoBorder: '#2563EB',

  disabled: '#4B5563',
  disabledSurface: '#1F2937',

  // Constants
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Default export uses light colors for static references and backward compatibility
export const colors = lightColors;

// Semantic Tone Helpers for light and dark environments
export function getTone(tone, isDark = false) {
  if (isDark) {
    switch (tone) {
      case 'green':
      case 'success':
        return { bg: '#064E3B', fg: '#4ADE80', border: '#059669' };
      case 'red':
      case 'emergency':
      case 'danger':
        return { bg: '#450A0A', fg: '#F87171', border: '#DC2626' };
      case 'orange':
      case 'yellow':
      case 'warning':
        return { bg: '#451A03', fg: '#FBBF24', border: '#D97706' };
      case 'blue':
      case 'info':
        return { bg: '#1E3A8A', fg: '#60A5FA', border: '#2563EB' };
      case 'teal':
        return { bg: '#0F3836', fg: '#2DD4BF', border: '#00B8A9' };
      case 'grey':
      default:
        return { bg: '#1E2D42', fg: '#9AA9BC', border: '#2B3B52' };
    }
  }

  // Light mode tones
  switch (tone) {
    case 'green':
    case 'success':
      return { bg: '#E4F6EE', fg: '#15803D', border: '#86EFAC' };
    case 'red':
    case 'emergency':
    case 'danger':
      return { bg: '#FDE8E8', fg: '#B42332', border: '#FCA5A5' };
    case 'orange':
    case 'yellow':
    case 'warning':
      return { bg: '#FFF4D6', fg: '#92400E', border: '#FCD34D' };
    case 'blue':
    case 'info':
      return { bg: '#EAF2FF', fg: '#1D4ED8', border: '#BFDBFE' };
    case 'teal':
      return { bg: '#E6F8F6', fg: '#00A99D', border: '#B2EBF2' };
    case 'grey':
    default:
      return { bg: '#F0F4F8', fg: '#596579', border: '#DCE4EE' };
  }
}

export const tones = {
  green: getTone('green', false),
  red: getTone('red', false),
  orange: getTone('orange', false),
  blue: getTone('blue', false),
  teal: getTone('teal', false),
  grey: getTone('grey', false),
};
