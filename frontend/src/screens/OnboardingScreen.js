// 4 swipeable slides with Skip / Next. The last slide offers "Get started" plus a clearly
// labelled, non-functional "Connect / register helmet (Coming soon)" so nothing looks active but does nothing.
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '../components/AppButton';
import { ONBOARDING_KEY } from './SplashScreen';
import { colors, spacing, typography, MIN_TOUCH } from '../constants/theme';

const SLIDES = [
  { key: 'detect', icon: 'shield-checkmark', title: 'Accident detection & emergency alerts', text: 'The helmet detects a serious impact and alerts your emergency contacts automatically.' },
  { key: 'gps', icon: 'location', title: 'GPS location tracking', text: "See the helmet's last known GPS position. This is the helmet's location, not your phone's." },
  { key: 'contacts', icon: 'people', title: 'Emergency contact management', text: 'Choose who is notified and set a primary contact.' },
  { key: 'device', icon: 'hardware-chip', title: 'Helmet connection & monitoring', text: 'Check connection, sensors, GPS and GSM health at a glance.' },
];

export default function OnboardingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_e) {
      // Non-fatal: onboarding may show again next launch.
    }
    navigation.replace('Main');
  };

  const next = () => {
    if (isLast) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {!isLast ? (
          <Pressable onPress={finish} style={styles.skip} accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

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
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={64} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <AppButton title="Connect / register helmet — Coming soon" variant="secondary" disabled style={styles.gap} />
        ) : null}
        <AppButton title={isLast ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { height: MIN_TOUCH + 8, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: spacing.lg },
  skip: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...typography.title, textAlign: 'center' },
  text: { ...typography.body, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  gap: { marginBottom: spacing.sm },
});
