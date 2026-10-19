// Stand-in for 'firebase/auth' in tests. Anonymous sign-in always succeeds with a fixed uid.
let user = { uid: 'test-user-1', isAnonymous: true }; // already signed in
const listeners = new Set();
const auth = { get currentUser() { return user; } };
export const getAuth = () => auth;
export const initializeAuth = () => auth;
export const getReactNativePersistence = () => ({});
export async function signInAnonymously() {
  user = { uid: 'test-user-1', isAnonymous: true };
  listeners.forEach((fn) => fn(user));
  return { user };
}
export function onAuthStateChanged(_auth, next) {
  const fn = (u) => next(u);
  listeners.add(fn);
  setTimeout(() => next(user), 0);
  return () => listeners.delete(fn);
}
export const __reset = () => {};
