// TEMP stub (Person 1) — Person 3 replaces with the real hook. Same return shape as the contract.
import { useCallback, useState } from 'react';
import { mockDevice } from './tempMock';

export default function useDevice() {
  const [device, setDevice] = useState(mockDevice);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setDevice({ ...mockDevice, lastUpdated: new Date().toISOString() });
    setLoading(false);
  }, []);

  return { device, dataSource: 'demo', backendReachable: null, loading, error, refresh };
}
