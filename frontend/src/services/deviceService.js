import { demoStore } from './demoStore.js';
import { liveBackend } from './liveAdapter.js';
import { subscribeSlice } from './serviceUtils.js';

// Device telemetry. Emits the RAW device record; the useDevice hook applies the
// 30-second disconnect rule and hides coordinates when gpsValid is false.

export function subscribeDevice(onData, onError) {
  return subscribeSlice('device', 'subscribeDevice', onData, onError);
}

// App-level info: { dataSource: 'demo' | 'live', backendReachable: true | false | null }
export function subscribeApp(onData, onError) {
  return subscribeSlice('app', 'subscribeApp', onData, onError);
}

// "Request the latest available location from the data layer" (Location screen refresh).
export async function refreshDevice() {
  const backend = liveBackend();
  if (backend) return backend.refreshDevice();
  await demoStore.delay(500);
  demoStore.beat(); // a healthy pretend helmet reports again; an offline one stays silent
}
