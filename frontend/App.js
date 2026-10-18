import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import DemoControlsBar from './src/components/DemoControlsBar';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DemoControlsBar />
      <AppNavigator />
      <DemoControlsBar />
    </SafeAreaProvider>
  );
}
