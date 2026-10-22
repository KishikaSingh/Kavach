// Kavach Smart Helmet — Typography Tokens

import { colors } from './colors.js';

export const typography = {
  // Display Heading: Splash & Hero
  display: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textOnDark,
    letterSpacing: 0.5,
  },

  // Screen Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },

  // Section Heading
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // Card Title
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // Standard Body Text
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 20,
  },

  // Supporting / Secondary Text
  supporting: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Labels (Input, Badges)
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // Restrained Uppercase Metadata
  metadata: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Button Text
  button: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Small Caption
  caption: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
  },
};

export default typography;
