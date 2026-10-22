// Kavach Smart Helmet — Design System Colors
// Primary Palette: Midnight Navy, Deep Navy, Safety Teal, Cyan Accent

export const colors = {
  // Brand & Primary Identities
  midnightNavy: '#101B2D',
  deepNavy: '#172B4D',
  darkBlue: '#0B2545',
  safetyTeal: '#00B8A9',
  brightTeal: '#00A99D',
  cyanAccent: '#36CFC9',

  // Core Mapping
  primary: '#00B8A9',     // Safety Teal is primary action color
  primaryDark: '#009688',
  primarySoft: '#E6F8F6', // Very soft teal surface
  navy: '#101B2D',        // Top-level structure, headers, dark cards
  navySurface: '#172B4D',

  // Backgrounds and Surfaces
  background: '#F4F7FB',
  card: '#FFFFFF',
  cardAlt: '#F8FAFD',
  softBlue: '#EAF4FA',
  mutedSurface: '#F0F4F8',
  border: '#E5EAF1',
  borderFocus: '#00B8A9',

  // Typography Colors
  text: '#172033',          // Primary Text
  textSecondary: '#68758A', // Secondary Text
  textMuted: '#8A96A8',     // Muted Text
  textOnDark: '#FFFFFF',
  textOnTeal: '#FFFFFF',

  // Semantic & Feedback Colors
  success: '#16A34A',
  successSoft: '#E4F6EE',
  warning: '#F59E0B',
  warningSoft: '#FEF3DC',
  emergency: '#E5484D',
  emergencySoft: '#FDECEC',
  information: '#2563EB',
  infoSoft: '#EFF6FF',
  disabled: '#AAB4C3',
  disabledSoft: '#F1F4F8',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  grey: '#68758A',
  greySoft: '#EEF2F6',

  // Legacy mappings for backwards-compatibility
  green: '#16A34A',
  greenSoft: '#E4F6EE',
  red: '#E5484D',
  redSoft: '#FDECEC',
  orange: '#F59E0B',
  orangeSoft: '#FEF3DC',
  muted: '#68758A',
};

// Maps tone names to foreground, background, and border styling
export const tones = {
  teal: { fg: colors.safetyTeal, bg: colors.primarySoft, border: '#B2EBF2' },
  green: { fg: colors.success, bg: colors.successSoft, border: '#86EFAC' },
  red: { fg: colors.emergency, bg: colors.emergencySoft, border: '#FCA5A5' },
  orange: { fg: colors.warning, bg: colors.warningSoft, border: '#FCD34D' },
  blue: { fg: colors.information, bg: colors.infoSoft, border: '#BFDBFE' },
  grey: { fg: colors.textSecondary, bg: colors.greySoft, border: colors.border },
  navy: { fg: colors.white, bg: colors.deepNavy, border: colors.midnightNavy },
};

export const getTone = (tone) => tones[tone] || tones.grey;

export default colors;
