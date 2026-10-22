// Logo + project name with a short fade/scale animation, then routes to Onboarding (first launch)
// or straight to the tabs. Uses replace() so Back never returns here.
import React, { useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../constants/theme';

export const ONBOARDING_KEY = 'onboardingComplete';

export default function SplashScreen({ navigation }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const timer = setTimeout(async () => {
      let done = null;
      try {
        done = await AsyncStorage.getItem(ONBOARDING_KEY);
      } catch {
        // If storage fails, fall back to showing onboarding.
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
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={56} color={colors.white} />
        </View>
        <Text style={styles.name}>KAVACH</Text>
        <Text style={styles.tagline}>Smart Helmet · Autonomous Accident Detection & Emergency Dispatch</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: spacing.xl },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  name: { fontSize: 30, fontWeight: '800', color: colors.white },
  tagline: { fontSize: 14, color: '#B8C4DE', textAlign: 'center', marginTop: spacing.sm },
});
