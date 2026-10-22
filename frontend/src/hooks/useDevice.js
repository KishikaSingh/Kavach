import { useCallback, useEffect, useMemo, useState } from 'react';
import { DATA_SOURCE } from '../config.js';
import { subscribeApp, subscribeDevice, refreshDevice } from '../services/deviceService.js';
import { deriveDevice } from '../utils/deviceStatus.js';
import { useSubscription } from './useSubscription.js';

// useDevice() -> { device, dataSource, backendReachable, loading, error, refresh, refreshing }
//
// device is the derived record (see utils/deviceStatus.js):
//   - helmetStatus becomes "disconnected" when no update arrived for 30 s;
//   - latitude/longitude are null whenever gpsValid is false (never show a fake position);
//   - extra fields: gpsStatus ('available' | 'searching' | 'unavailable' | 'stale'),
//     gpsAgeMs, lastCommunicationAgeMs.
// dataSource is 'demo' or 'live'. backendReachable is true / false / null (null = unknown or demo).
export function useDevice() {
  const deviceSub = useSubscription(subscribeDevice);
  const appSub = useSubscription(subscribeApp);

  // Re-evaluate staleness every 5 s even if no new data arrives.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    if (id?.unref) id.unref();
    return () => clearInterval(id);
  }, []);

  const device = useMemo(() => deriveDevice(deviceSub.data, now), [deviceSub.data, now]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshDevice();
    } catch (e) {
      setRefreshError(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    device,
    dataSource: appSub.data?.dataSource ?? DATA_SOURCE,
    backendReachable: appSub.data?.backendReachable ?? null,
    loading: deviceSub.loading,
    error: deviceSub.error || refreshError,
    refresh,
    refreshing,
    retry: deviceSub.retry,
  };
}
export default useDevice;
