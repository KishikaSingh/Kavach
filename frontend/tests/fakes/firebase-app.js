// Stand-in for 'firebase/app' in tests. No network.
const apps = [];
export function initializeApp(config) {
  const app = { config };
  apps.push(app);
  return app;
}
export const getApps = () => apps;
export const getApp = () => apps[0];
