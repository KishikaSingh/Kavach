// Onboarding: 3 concise safety concepts with spacious layout, Safety Teal pills, and Get Started action.
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '../components/AppButton.js';
import { ONBOARDING_KEY } from './SplashScreen.js';
import { spacing, typography, MIN_TOUCH } from '../theme/index.js';
import { useTheme } from '../hooks/useTheme.js';

const SLIDES = [
  {
    key: 'detect',
    icon: 'shield-checkmark-outline',
    title: 'Autonomous Accident Detection',
    subtitle: 'High-G Impact Analysis',
    text: 'Continuous telemetry monitors helmet motion. Serious impacts trigger immediate automated emergency evaluation.',
  },
  {
    key: 'gps',
    icon: 'location-outline',
    title: 'Precision Location Sharing',
    subtitle: 'Real-Time Hardware GPS',
    text: 'Accident alerts transmit the exact coordinates from the helmet GPS sensor directly to emergency services and responders.',
  },
  {
    key: 'contacts',
    icon: 'people-outline',
    title: 'Emergency Contact Alerts',
    subtitle: 'Instant SMS & Push Notifications',
    text: 'Designated primary guardians receive prioritized notifications and live Google Maps links the moment an incident is detected.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_e) {
      // Non-fatal
    }
    navigation.replace('Main');
  };

  const next = () => {
    if (isLast) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.miniShield}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>KAVACH</Text>
        </View>
        {!isLast ? (
          <Pressable onPress={finish} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip onboarding">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : <View style={styles.skipPlaceholder} />}
      </View>

      {/* Slide Carousel */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconCircleOuter}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={64} color={colors.safetyTeal} />
              </View>
            </View>
            <Text style={styles.subtitleTag}>{item.subtitle.toUpperCase()}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      {/* Indicator Dots */}
      <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <AppButton
          title={isLast ? 'Get Started' : 'Continue'}
          icon={isLast ? 'checkmark-circle-outline' : 'arrow-forward'}
          onPress={next}
          variant="primary"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: MIN_TOUCH + 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniShield: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.safetyTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  skip: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipPlaceholder: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCircleOuter: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(0, 184, 169, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 169, 0.2)',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? '#000000' : colors.midnightNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  subtitleTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.safetyTeal,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.safetyTeal,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
