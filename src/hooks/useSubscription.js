import { useCallback, useEffect, useState } from 'react';

// Shared plumbing for all data hooks: subscribe on mount, unsubscribe on unmount,
// expose { data, loading, error, retry }.
// `subscribe(onData, onError)` must return an unsubscribe function.
export function useSubscription(subscribe) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribe(
      (value) => {
        setData(value);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribe, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}
