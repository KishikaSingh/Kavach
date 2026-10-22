// Kavach ThemeProvider: Light / Dark / System Appearance State & Context
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './themes.js';
import { getTone } from './colors.js';

export const THEME_STORAGE_KEY = '@kavach_theme_mode';

export const ThemeContext = createContext({
  mode: 'system',
  isDark: false,
  theme: lightTheme,
  colors: lightTheme.colors,
  typography: lightTheme.typography,
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  shadows: lightTheme.shadows,
  setMode: () => {},
  getTone: (tone) => getTone(tone, false),
});

export function ThemeProvider({ children, initialMode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState(initialMode || 'system');
  const [isReady, setIsReady] = useState(false);

  // Load saved appearance preference on app startup
  useEffect(() => {
    let mounted = true;
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (mounted && saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setModeState(saved);
        }
      } catch (_err) {
        // Fallback to system default on storage read error
      } finally {
        if (mounted) setIsReady(true);
      }
    }
    loadSavedTheme();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = async (newMode) => {
    if (!['light', 'dark', 'system'].includes(newMode)) return;
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (_err) {
      // Non-fatal if storage fails
    }
  };

  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [mode, systemColorScheme]);

  const activeTheme = isDark ? darkTheme : lightTheme;

  const contextValue = useMemo(
    () => ({
      mode,
      isDark,
      isReady,
      theme: activeTheme,
      colors: activeTheme.colors,
      typography: activeTheme.typography,
      spacing: activeTheme.spacing,
      radius: activeTheme.radius,
      shadows: activeTheme.shadows,
      setMode,
      getTone: (tone) => getTone(tone, isDark),
    }),
    [mode, isDark, isReady, activeTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context;
}

export default ThemeProvider;
