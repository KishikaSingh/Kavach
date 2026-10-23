import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

function getUrl() {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
}

function getKey() {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

let client = null;

export function isSupabaseConfigured() {
  return Boolean(getUrl() && getKey());
}

export function getSupabaseUrl() {
  return getUrl();
}

export function getSupabasePublishableKey() {
  return getKey();
}

export function getSupabaseClient() {
  if (client) return client;

  if (!isSupabaseConfigured()) {
    return null;
  }

  client = createClient(getUrl(), getKey(), {
    auth: {
      storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return client;
}

export function resetSupabaseClient() {
  client = null;
}
