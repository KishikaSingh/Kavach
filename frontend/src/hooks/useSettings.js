import { subscribeSettings, updateSettings } from '../services/settingsService.js';
import { useSubscription } from './useSubscription.js';

// useSettings() -> { settings, loading, error, updateSettings }
// settings: { accidentThreshold (null = not configurable yet), notifications: { push, sound } }
// updateSettings({ notifications: { sound: false } }) merges. Changing accidentThreshold
// rejects with code UNSUPPORTED - show it as "Unavailable" / "Coming soon" in the UI.
export function useSettings() {
  const { data, loading, error, retry } = useSubscription(subscribeSettings);
  return { settings: data, loading, error, retry, updateSettings };
}
export default useSettings;
