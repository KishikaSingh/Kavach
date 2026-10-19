// Small helpers for subscription-style APIs.
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Keeps the latest value (or error) a subscribe(onData, onError) function delivers.
export function watch(subscribe) {
  const state = { value: undefined, error: null, calls: 0 };
  const unsubscribe = subscribe(
    (v) => { state.value = v; state.calls += 1; },
    (e) => { state.error = e; }
  );
  return { state, unsubscribe };
}
