// Design tokens for the Smart Helmet app. Owned by Person 1 (only P1 edits this file).
// Convention: green = safe/connected, red = accident/emergency, orange = warning, grey = unknown/unavailable.
import { Platform } from 'react-native';

export const colors = {
  navy: '#0B1B3A', // primary text
  muted: '#5B6780', // secondary text
  background: '#F4F7FB',
  card: '#FFFFFF',
  border: '#E3E8F0',
  primary: '#1F4FD8',
  green: '#1FA971',
  greenSoft: '#E4F6EE',
  red: '#E5484D',
  redSoft: '#FDECEC',
  orange: '#F59E0B',
  orangeSoft: '#FEF3DC',
  grey: '#8A94A6',
  greySoft: '#EEF1F6',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const MIN_TOUCH = 44; // minimum touch target (dp)

export const typography = {
  title: { fontSize: 24, fontWeight: '700', color: colors.navy },
  heading: { fontSize: 18, fontWeight: '700', color: colors.navy },
  body: { fontSize: 15, fontWeight: '400', color: colors.navy },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  caption: { fontSize: 12, fontWeight: '400', color: colors.muted },
};

export const shadows = {
  card: Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: '#0B1B3A',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
};

// Maps a tone name to foreground/background colours (used by badges, cards, rows).
export const tones = {
  green: { fg: colors.green, bg: colors.greenSoft },
  red: { fg: colors.red, bg: colors.redSoft },
  orange: { fg: colors.orange, bg: colors.orangeSoft },
  grey: { fg: colors.grey, bg: colors.greySoft },
};

export const getTone = (tone) => tones[tone] || tones.grey;
