// Owned by Person 1 (only P1 edits this file).
// Flow: Splash -> Onboarding (first launch only) -> Main (bottom tabs).
// Stack screens above the tabs: AlertDetails, ContactForm, Notifications, Profile.
import React, { useEffect } from 'react';
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { initPushNotifications, stopPushNotifications } from '../services/notificationService.js';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DeviceSettingsScreen from '../screens/DeviceSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
// Person 2 owns these. Placeholders until their versions land (same file names, same default export).
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

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary, card: colors.white, text: colors.navy, border: colors.border },
};

const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Location: ['location', 'location-outline'],
  Alerts: ['alert-circle', 'alert-circle-outline'],
  Contacts: ['people', 'people-outline'],
  Settings: ['settings', 'settings-outline'],
};

function MainTabs() {
  const insets = useSafeAreaInsets(); // keeps the tab bar clear of the Android system navigation bar
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
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

const headerOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.navy,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
};

export default function AppNavigator() {
  useEffect(() => {
    return stopPushNotifications;
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
        {/* Splash/Onboarding use replace() and disable gestures so Back never returns to them. */}
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} options={{ ...headerOptions, title: 'Alert Details' }} />
        <Stack.Screen name="ContactForm" component={ContactFormScreen} options={{ ...headerOptions, title: 'Contact' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...headerOptions, title: 'Notifications' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ ...headerOptions, title: 'Profile' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
