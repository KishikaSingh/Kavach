// Tiny stand-in for 'react' in tests, just enough to run the app's data hooks without a screen.
// useState / useEffect / useMemo / useCallback / useRef behave like React's; renders are batched.
// This is NOT a React test renderer: component trees are not tested here.
let current = null;

const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

export function useState(initial) {
  const inst = current;
  const i = inst.index++;
  if (!(i in inst.slots)) {
    inst.slots[i] = {
      value: typeof initial === 'function' ? initial() : initial,
      set(next) {
        const value = typeof next === 'function' ? next(inst.slots[i].value) : next;
        if (Object.is(value, inst.slots[i].value)) return;
        inst.slots[i].value = value;
        inst.schedule();
      },
    };
  }
  return [inst.slots[i].value, inst.slots[i].set];
}

export function useRef(initial) {
  const inst = current;
  const i = inst.index++;
  if (!(i in inst.slots)) inst.slots[i] = { current: initial };
  return inst.slots[i];
}

export function useMemo(factory, deps) {
  const inst = current;
  const i = inst.index++;
  const slot = inst.slots[i];
  if (slot && sameDeps(slot.deps, deps)) return slot.value;
  inst.slots[i] = { deps, value: factory() };
  return inst.slots[i].value;
}

export function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}

export function useEffect(effect, deps) {
  const inst = current;
  const i = inst.index++;
  const slot = inst.slots[i];
  if (slot && deps && sameDeps(slot.deps, deps)) return;
  inst.pendingEffects.push(() => {
    if (slot && slot.cleanup) slot.cleanup();
    const cleanup = effect();
    inst.slots[i] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : null };
  });
  if (!slot) inst.slots[i] = { deps: null, cleanup: null };
}

// renderHook(() => useSomething()) -> { result: { current }, unmount() }
export function renderHook(hook) {
  const inst = {
    slots: [], index: 0, pendingEffects: [], scheduled: false, unmounted: false,
    schedule() {
      if (inst.scheduled || inst.unmounted) return;
      inst.scheduled = true;
      queueMicrotask(() => { inst.scheduled = false; render(); });
    },
  };
  const result = { current: null };
  function render() {
    if (inst.unmounted) return;
    current = inst;
    inst.index = 0;
    try { result.current = hook(); } finally { current = null; }
    const effects = inst.pendingEffects.splice(0);
    effects.forEach((run) => run());
  }
  render();
  return {
    result,
    unmount() {
      inst.unmounted = true;
      inst.slots.forEach((s) => s && s.cleanup && s.cleanup());
    },
  };
}

export async function waitFor(predicate, message = 'condition', timeoutMs = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for: ${message}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

export default { useState, useEffect, useMemo, useCallback, useRef };
