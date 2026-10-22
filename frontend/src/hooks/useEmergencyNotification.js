import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  dispatchEmergencyNotification,
  getEmergencyDispatch,
  retryEmergencyNotification,
  subscribeEmergencyDispatch,
} from '../services/emergencyNotificationService.js';

export function useEmergencyNotification(alertId) {
  const [liveRecord, setLiveRecord] = useState(null);

  useEffect(() => {
    if (!alertId) return () => {};
    const unsub = subscribeEmergencyDispatch(alertId, (record) => {
      setLiveRecord(record);
    });
    return unsub;
  }, [alertId]);

  const dispatchRecord = alertId
    ? liveRecord?.alertId === String(alertId)
      ? liveRecord
      : getEmergencyDispatch(alertId)
    : null;

  const notify = useCallback(
    async (alert, options) => {
      const target = alert || { id: alertId };
      return dispatchEmergencyNotification(target, options);
    },
    [alertId]
  );

  const retry = useCallback(
    async (alert, options) => {
      const target = alert || { id: alertId };
      return retryEmergencyNotification(target, options);
    },
    [alertId]
  );

  const openManualSms = useCallback(
    async (customUrl) => {
      const url = customUrl || dispatchRecord?.fallbackUrl;
      if (!url) return false;
      try {
        const can = await Linking.canOpenURL(url);
        if (can) {
          await Linking.openURL(url);
          return true;
        }
      } catch (e) {
        console.warn('Could not open SMS URL', e);
      }
      return false;
    },
    [dispatchRecord]
  );

  const isSending = dispatchRecord?.status === 'sending';

  return {
    dispatchRecord,
    isSending,
    notify,
    retry,
    openManualSms,
  };
}

export default useEmergencyNotification;
