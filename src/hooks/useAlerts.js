import { useCallback, useMemo, useState } from 'react';
import { refreshAlerts, resolveAlert, subscribeAlerts } from '../services/alertService.js';
import { useSubscription } from './useSubscription.js';

// useAlerts() -> { alerts, activeAlerts, loading, error, refresh, refreshing, resolveAlert }
// alerts: newest first. activeAlerts: those with status "new".
// resolveAlert(id) must only be called from an explicit user action; viewing never resolves.
export function useAlerts() {
  const { data, loading, error, retry } = useSubscription(subscribeAlerts);

  const alerts = useMemo(
    () => [...(data || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [data]
  );
  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === 'new'), [alerts]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAlerts();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { alerts, activeAlerts, loading, error, refresh, refreshing, retry, resolveAlert };
}
