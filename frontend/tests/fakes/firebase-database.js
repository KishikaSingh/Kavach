// Stand-in for 'firebase/database' in tests: a tiny in-memory Realtime Database.
// Same function names and behaviour the app uses (ref, onValue, get, set, update, push, remove).
export const tree = {};
const listeners = [];
let counter = 0;

const parts = (path) => String(path).split('/').filter(Boolean);
const copy = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));

function getAt(path) {
  let node = tree;
  for (const key of parts(path)) {
    if (node === null || typeof node !== 'object') return null;
    node = node[key];
  }
  return node === undefined ? null : node;
}

function setAt(path, value) {
  const keys = parts(path);
  if (!keys.length) return;
  let node = tree;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] === null || typeof node[keys[i]] !== 'object') node[keys[i]] = {};
    node = node[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = copy(value);
}

const snapshot = (path) => {
  const v = getAt(path);
  return { exists: () => v !== null, val: () => copy(v) };
};

function notify() {
  listeners.slice().forEach((l) => l.callback(snapshot(l.path)));
}

// ----- test helpers (not part of the real SDK) -----
export function __reset(initial = {}) {
  Object.keys(tree).forEach((k) => delete tree[k]);
  Object.entries(initial).forEach(([k, v]) => { tree[k] = copy(v); });
  listeners.length = 0;
  counter = 0;
}
export const __write = (path, value) => { setAt(path, value); notify(); }; // "someone else" (e.g. the helmet) writes
export const __read = (path) => copy(getAt(path));
export const __listenerCount = () => listeners.length;

// ----- the part of the SDK the app uses -----
export const getDatabase = () => ({});
export const ref = (db, path = '') => ({ path: parts(path).join('/') });

export function push(r, value) {
  counter += 1;
  const key = `-k${String(counter).padStart(4, '0')}`;
  const child = { path: `${r.path}/${key}`.replace(/^\//, ''), key };
  if (value === undefined) return child;
  setAt(child.path, value);
  notify();
  return Object.assign(Promise.resolve(), child);
}

export async function set(r, value) { setAt(r.path, value); notify(); }
export async function get(r) { return snapshot(r.path); }
export async function remove(r) { setAt(r.path, null); notify(); }
export async function update(r, patch) {
  Object.entries(patch).forEach(([k, v]) => setAt(`${r.path}/${k}`, v));
  notify();
}

export function onValue(r, callback) {
  if (r.path === '.info/connected') {
    callback({ val: () => true });
    return () => {};
  }
  const entry = { path: r.path, callback };
  listeners.push(entry);
  callback(snapshot(r.path));
  return () => {
    const i = listeners.indexOf(entry);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export async function runTransaction(r, fn) {
  const next = fn(copy(getAt(r.path)));
  if (next === undefined) return { committed: false, snapshot: snapshot(r.path) };
  setAt(r.path, next);
  notify();
  return { committed: true, snapshot: snapshot(r.path) };
}
