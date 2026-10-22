// Kavach Smart Helmet: Application Navigation
// Flow: Splash -> Onboarding (first launch) -> Main (Bottom Tabs: Home, Location, Alerts, Contacts, Settings)
// Stack screens above tabs: AlertDetails, ContactForm, Notifications, Profile.
// Dynamic Theme-aware navigation container and tab bar.

import React, { useEffect, useMemo } from 'react';
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider.js';
import { initPushNotifications, stopPushNotifications } from '../services/notificationService.js';
import { startEmergencyNotificationWatcher, stopEmergencyNotificationWatcher } from '../services/emergencyNotificationService.js';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DeviceSettingsScreen from '../screens/DeviceSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LocationScreen from '../screens/LocationScreen';
import AlertsScreen from '../screens/AlertsScreen';
import AlertDetailsScreen from '../screens/AlertDetailsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactFormScreen from '../screens/ContactFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

let pendingAlertId = null;
let pushInitializationStarted = false;

function openAlertFromPush({ alertId }) {
  if (!alertId) return;
  if (navigationRef.isReady()) {
    navigationRef.navigate('AlertDetails', { alertId });
  } else {
    pendingAlertId = alertId;
  }
}

const TAB_ICONS = {
  Home: ['shield-checkmark', 'shield-checkmark-outline'],
  Location: ['navigate', 'navigate-outline'],
  Alerts: ['alert-circle', 'alert-circle-outline'],
  Contacts: ['people', 'people-outline'],
  Settings: ['settings', 'settings-outline'],
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.safetyTeal,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginBottom: 2,
        },
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: isDark ? 4 : 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = TAB_ICONS[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Location" component={LocationScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Settings" component={DeviceSettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    startEmergencyNotificationWatcher();
    return () => {
      stopPushNotifications();
      stopEmergencyNotificationWatcher();
    };
  }, []);

  const initializePushAfterOnboarding = () => {
    if (pushInitializationStarted || navigationRef.getCurrentRoute()?.name !== 'Main') return;
    pushInitializationStarted = true;
    initPushNotifications({ onAccidentAlertTap: openAlertFromPush })
      .then((result) => {
        if (result.reason) console.info(`Push notifications unavailable: ${result.reason}`);
        else if (result.permission === 'denied') console.info('Push notification permission was not granted.');
      })
      .catch((error) => console.error('Could not initialize push notifications.', error));
  };

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        primary: colors.safetyTeal,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    }),
    [isDark, colors]
  );

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onStateChange={initializePushAfterOnboarding}
      onReady={() => {
        if (!pendingAlertId) return;
        navigationRef.navigate('AlertDetails', { alertId: pendingAlertId });
        pendingAlertId = null;
      }}
    >
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ContactForm" component={ContactFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
