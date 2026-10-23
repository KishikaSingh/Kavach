import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA_SOURCE } from '../config.js';
import { normalizePhone } from '../utils/validators.js';
import { formatDateTime } from '../utils/formatTime.js';
import { googleMapsUrl } from '../utils/mapLinks.js';
import { demoStore } from './demoStore.js';
import { subscribeAlerts } from './alertService.js';
import { subscribeContacts } from './contactService.js';
import { getSmsProvider } from './smsProvider.js';
import { createNotification } from './inboxService.js';

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const STORAGE_KEY = '@kavach:emergency_dispatches';

let configuredThreshold = DEFAULT_CONFIDENCE_THRESHOLD;
const dispatchRegistry = new Map();
const listeners = new Set();
const inFlightAlerts = new Set();
let storageLoaded = false;
let knownContacts = [];

// Cache contacts list for automatic incident dispatching
subscribeContacts((list) => {
  knownContacts = Array.isArray(list) ? list : [];
}, () => {});

function notifyListeners(alertId, record) {
  listeners.forEach((fn) => {
    try {
      fn(alertId, record);
    } catch (e) {
      console.warn('Emergency dispatch listener error', e);
    }
  });
}

export async function loadPersistedDispatches() {
  if (storageLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([id, rec]) => {
          if (!dispatchRegistry.has(id)) {
            dispatchRegistry.set(id, rec);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not load persisted emergency dispatches', e);
  } finally {
    storageLoaded = true;
  }
}

async function persistDispatches() {
  try {
    const obj = {};
    dispatchRegistry.forEach((v, k) => {
      obj[k] = v;
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Could not persist emergency dispatches', e);
  }
}

export function computeAlertConfidence(alert) {
  if (!alert) return 0;
  if (typeof alert.confidence === 'number' && Number.isFinite(alert.confidence)) {
    return Math.max(0, Math.min(1, alert.confidence));
  }
  const severity = String(alert.severity || '').toLowerCase();
  if (severity === 'high') return 0.95;
  if (severity === 'medium') return 0.75;
  if (severity === 'low') return 0.35;
  return 0.5;
}

export function getEmergencyConfidenceThreshold() {
  return configuredThreshold;
}

export function setEmergencyConfidenceThreshold(val) {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 1) {
    configuredThreshold = val;
  }
}

export function formatEmergencyLocation(alert) {
  if (alert && alert.gpsValid === true && alert.latitude != null && alert.longitude != null) {
    const url = googleMapsUrl(alert.latitude, alert.longitude);
    if (url) {
      return {
        hasLocation: true,
        latitude: alert.latitude,
        longitude: alert.longitude,
        mapsUrl: url,
        text: `Location: ${url} (${Number(alert.latitude).toFixed(5)}, ${Number(alert.longitude).toFixed(5)})`,
      };
    }
  }
  return {
    hasLocation: false,
    latitude: null,
    longitude: null,
    mapsUrl: null,
    text: 'Location: Unavailable (No GPS fix)',
  };
}

export function formatEmergencyMessage({ alert, userName, locationInfo }) {
  const name = (userName || 'Helmet Rider').trim();
  const time = alert?.timestamp ? formatDateTime(alert.timestamp) : formatDateTime(new Date().toISOString());
  const loc = locationInfo || formatEmergencyLocation(alert);
  return `EMERGENCY ALERT: ${name} may have been in a motorcycle accident at ${time}. ${loc.text}. Please verify their safety immediately.`;
}

export function validateEmergencyContacts(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return { valid: [], invalid: [] };
  }
  const valid = [];
  const invalid = [];

  for (const c of contacts) {
    if (!c) continue;
    const phoneRes = normalizePhone(c.phone);
    if (phoneRes.ok) {
      valid.push({
        id: c.id,
        name: c.name || 'Emergency Contact',
        phone: phoneRes.value,
        isPrimary: !!c.isPrimary,
      });
    } else {
      invalid.push({ contact: c, error: phoneRes.error });
    }
  }

  valid.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return { valid, invalid };
}

function recordInAppNotification({ alertId, status, recipients, message, error }) {
  let title = 'Emergency contacts notified';
  let body = `Accident alert sent to ${recipients.map((r) => r.name).join(', ')}.`;

  if (status === 'demo_sent') {
    title = 'Demo: Emergency contacts notified';
    body = `[Simulated] Accident alert dispatched to ${recipients.map((r) => r.name).join(', ')}.`;
  } else if (status === 'unconfigured') {
    title = 'Emergency SMS unconfigured';
    body = 'Accident detected, but emergency SMS gateway is unconfigured. Manual action required.';
  } else if (status === 'failed') {
    title = 'Emergency contact alert failed';
    body = `Failed to notify emergency contacts: ${error || 'Network error'}.`;
  } else if (status === 'no_contacts') {
    title = 'No emergency contacts registered';
    body = 'Accident detected, but no emergency contacts are registered.';
  }

  const notification = {
    id: `em_${alertId}_${Date.now()}`,
    type: 'alertUpdate',
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    alertId: String(alertId),
  };

  if (DATA_SOURCE === 'demo') {
    try {
      const list = demoStore.get('notifications') || [];
      demoStore.set('notifications', [notification, ...list]);
    } catch (_) {}
  } else {
    try {
      createNotification(notification).catch(() => {});
    } catch (err) {
      console.warn('Could not record in-app notification', err);
    }
  }
}

export async function dispatchEmergencyNotification(alert, options = {}) {
  await loadPersistedDispatches();

  if (!alert || !alert.id) {
    return { status: 'invalid_alert', error: 'Missing or invalid alert object.' };
  }

  const alertId = String(alert.id);

  // Prevent concurrent duplicate executions
  if (inFlightAlerts.has(alertId)) {
    return { status: 'sending', alertId, reason: 'Dispatch already in flight.' };
  }

  // Duplicate suppression
  const existing = dispatchRegistry.get(alertId);
  if (
    !options.forceRetry &&
    existing &&
    (existing.status === 'sent' || existing.status === 'demo_sent')
  ) {
    return {
      ...existing,
      duplicateSuppressed: true,
    };
  }

  const confidence = computeAlertConfidence(alert);
  const threshold = typeof options.threshold === 'number' ? options.threshold : configuredThreshold;

  if (confidence < threshold) {
    const record = {
      alertId,
      status: 'below_threshold',
      confidence,
      threshold,
      timestamp: new Date().toISOString(),
      recipients: [],
      reason: `Confidence ${confidence.toFixed(2)} is below threshold ${threshold.toFixed(2)}.`,
    };
    dispatchRegistry.set(alertId, record);
    notifyListeners(alertId, record);
    return record;
  }

  // Get and validate emergency contacts
  const contactsToUse = options.contacts || knownContacts;
  const { valid, invalid } = validateEmergencyContacts(contactsToUse);

  if (valid.length === 0) {
    const record = {
      alertId,
      status: 'no_contacts',
      confidence,
      threshold,
      timestamp: new Date().toISOString(),
      recipients: [],
      invalidContacts: invalid,
      reason: 'No valid emergency contacts are registered.',
    };
    dispatchRegistry.set(alertId, record);
    await persistDispatches();
    notifyListeners(alertId, record);
    recordInAppNotification(record);
    return record;
  }

  // Format message
  const locationInfo = formatEmergencyLocation(alert);
  const message = formatEmergencyMessage({
    alert,
    userName: options.userName,
    locationInfo,
  });

  const primaryPhone = valid[0].phone;
  const fallbackUrl = `sms:${primaryPhone}?body=${encodeURIComponent(message)}`;

  inFlightAlerts.add(alertId);

  // Notify listeners that sending has begun
  const sendingRecord = {
    alertId,
    status: 'sending',
    confidence,
    threshold,
    timestamp: new Date().toISOString(),
    recipients: valid,
    message,
    fallbackUrl,
  };
  dispatchRegistry.set(alertId, sendingRecord);
  notifyListeners(alertId, sendingRecord);

  let finalRecord;

  try {
    const isLive = options.isLive ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'live' || DATA_SOURCE === 'live');
    const provider = options.smsProvider || getSmsProvider({
      isDemo: options.isDemo,
      isLive,
      gatewayUrl: options.gatewayUrl,
      apiKey: options.apiKey,
    });

    const dispatchResult = await provider.dispatch({
      alertId,
      alert,
      recipients: valid,
      message,
      location: {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
        mapsUrl: locationInfo.mapsUrl,
      },
      confidence,
      threshold,
      user: options.userName,
    });

    finalRecord = {
      alertId,
      status: dispatchResult.status,
      channel: dispatchResult.channel,
      provider: dispatchResult.provider,
      confidence,
      threshold,
      timestamp: dispatchResult.timestamp || new Date().toISOString(),
      recipients: valid,
      message,
      fallbackUrl,
      ...(dispatchResult.reason ? { reason: dispatchResult.reason } : {}),
      ...(dispatchResult.note ? { note: dispatchResult.note } : {}),
    };
  } catch (error) {
    finalRecord = {
      alertId,
      status: 'failed',
      confidence,
      threshold,
      timestamp: new Date().toISOString(),
      recipients: valid,
      message,
      fallbackUrl,
      error: error?.message || 'Network error while contacting SMS gateway.',
    };
  } finally {
    inFlightAlerts.delete(alertId);
  }

  dispatchRegistry.set(alertId, finalRecord);
  await persistDispatches();
  notifyListeners(alertId, finalRecord);
  recordInAppNotification(finalRecord);

  return finalRecord;
}

export async function retryEmergencyNotification(alert, options = {}) {
  return dispatchEmergencyNotification(alert, { ...options, forceRetry: true });
}

export function getEmergencyDispatch(alertId) {
  if (!alertId) return null;
  return dispatchRegistry.get(String(alertId)) || null;
}

export function subscribeEmergencyDispatch(alertId, callback) {
  if (typeof callback !== 'function') return () => {};
  const idStr = String(alertId);

  const handler = (changedId, record) => {
    if (changedId === idStr) callback(record);
  };

  listeners.add(handler);

  // Emit current state immediately if available
  const current = dispatchRegistry.get(idStr);
  if (current) {
    try {
      callback(current);
    } catch (_) {}
  } else {
    loadPersistedDispatches().then(() => {
      const persisted = dispatchRegistry.get(idStr);
      if (persisted) callback(persisted);
    });
  }

  return () => {
    listeners.delete(handler);
  };
}

export function subscribeAllEmergencyDispatches(callback) {
  if (typeof callback !== 'function') return () => {};
  const handler = (changedId, record) => {
    callback(changedId, record);
  };
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

let activeWatcherUnsubscribe = null;

export function startEmergencyNotificationWatcher(options = {}) {
  if (activeWatcherUnsubscribe) {
    return activeWatcherUnsubscribe;
  }

  activeWatcherUnsubscribe = subscribeAlerts(
    (alerts) => {
      if (!Array.isArray(alerts)) return;
      // Find active new alerts
      const newAlerts = alerts.filter((a) => a && a.status === 'new');
      for (const alert of newAlerts) {
        const id = String(alert.id);
        const existing = dispatchRegistry.get(id);
        if (!existing && !inFlightAlerts.has(id)) {
          dispatchEmergencyNotification(alert, options).catch((err) => {
            console.warn(`Automated emergency notification failed for ${id}:`, err);
          });
        }
      }
    },
    (err) => console.warn('Emergency notification watcher subscription error:', err)
  );

  return () => {
    if (activeWatcherUnsubscribe) {
      activeWatcherUnsubscribe();
      activeWatcherUnsubscribe = null;
    }
  };
}

export function stopEmergencyNotificationWatcher() {
  if (activeWatcherUnsubscribe) {
    activeWatcherUnsubscribe();
    activeWatcherUnsubscribe = null;
  }
}

export function resetEmergencyDispatchesForTesting() {
  dispatchRegistry.clear();
  inFlightAlerts.clear();
  configuredThreshold = DEFAULT_CONFIDENCE_THRESHOLD;
  storageLoaded = false;
  stopEmergencyNotificationWatcher();
}
