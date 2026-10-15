// TEMP stub (Person 1) - Person 3 replaces with the real hook.
// Same return shape as the contract. Returns the demo data for the helmet
// chosen on the Select Helmet screen (see useHelmets).
import { useCallback, useState } from 'react';
import useHelmets from './useHelmets';
import { mockDevices } from './tempMock';

export default function useDevice() {
  const { selectedId } = useHelmets();
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);

  const base = selectedId ? mockDevices[selectedId] : null;

  // A connected helmet "reports in" when refreshed; an offline one does not.
  const device =
    base && refreshedAt && base.helmetStatus === 'connected'
      ? { ...base, lastUpdated: refreshedAt }
      : base;

  const refresh = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setRefreshedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  return {
    device,
    dataSource: 'demo',
    backendReachable: null,
    loading,
    error,
    refresh,
  };
}