// Splash Screen: Midnight navy branding with Safety Teal Kavach shield emblem.
// Routes to Onboarding on first launch or directly to Main tabs.
import React, { useEffect, useState } from 'react';
import { View, Text, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../theme/index.js';

export const ONBOARDING_KEY = 'onboardingComplete';

export default function SplashScreen({ navigation }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.85));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const timer = setTimeout(async () => {
      let done = null;
      try {
        done = await AsyncStorage.getItem(ONBOARDING_KEY);
      } catch {
        // Fall back to onboarding if storage read fails
      }
      if (!cancelled) navigation.replace(done === 'true' ? 'Main' : 'Onboarding');
    }, 1800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={styles.outerGlow}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={54} color={colors.white} />
          </View>
        </View>
        <Text style={styles.name}>KAVACH</Text>
        <Text style={styles.tagline}>Ride Safe. Always Ahead.</Text>
        <Text style={styles.subtitle}>Smart Helmet Safety System</Text>

        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.safetyTeal} size="small" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  outerGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 184, 169, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(54, 207, 201, 0.3)',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.safetyTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.safetyTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cyanAccent,
    textAlign: 'center',
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A96A8',
    textAlign: 'center',
    marginTop: 4,
  },
  loaderWrap: {
    marginTop: spacing.xxxl,
    height: 24,
    justifyContent: 'center',
  },
});
