export const Platform = { OS: 'android', select: (o) => o?.android ?? o?.default };
export const Linking = {
  openURL: async () => true,
  canOpenURL: async () => true,
};
export const StyleSheet = {
  create: (styles) => styles,
  flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}),
};
export const View = 'View';
export const Text = 'Text';
export const Switch = 'Switch';
export const Pressable = 'Pressable';
export const ActivityIndicator = 'ActivityIndicator';
export const ScrollView = 'ScrollView';
export const RefreshControl = 'RefreshControl';
export const useColorScheme = () => 'light';

export default {
  Platform,
  Linking,
  StyleSheet,
  View,
  Text,
  Switch,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useColorScheme,
};
