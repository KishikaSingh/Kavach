import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { ServiceError } from './serviceError.js';

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || 'HELMET_001';

const DEFAULT_SETTINGS = {
  accidentThreshold: null,
  notifications: { push: true, sound: true },
};

let cachedUser = null;
let authPromise = null;

function checkConfigured() {
  if (!isSupabaseConfigured()) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
}

async function ensureAuthenticated() {
  checkConfigured();
  const supabase = getSupabaseClient();
  if (cachedUser) return cachedUser;

  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (session?.user) {
        cachedUser = session.user;
        return cachedUser;
      }

      // If test credentials provided in env, use them
      const testEmail = process.env.EXPO_PUBLIC_SUPABASE_TEST_EMAIL;
      const testPassword = process.env.EXPO_PUBLIC_SUPABASE_TEST_PASSWORD;
      if (testEmail && testPassword) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        if (!signInError && signInData?.user) {
          cachedUser = signInData.user;
          return cachedUser;
        }
      }

      // Attempt anonymous sign-in if enabled
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && anonData?.user) {
        cachedUser = anonData.user;
        return cachedUser;
      }

      // Fallback: Check user from getUser()
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        cachedUser = user;
        return cachedUser;
      }

      // If anonymous auth is disabled on the project, create a demo user session
      const fallbackEmail = `demo_user_${Date.now()}@kavach.local`;
      const fallbackPassword = `DemoPass_${Date.now()}!`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fallbackEmail,
        password: fallbackPassword,
        options: {
          data: { name: 'Kavach Demo Rider' },
        },
      });

      if (!signUpError && signUpData?.user) {
        cachedUser = signUpData.user;
        return cachedUser;
      }

      // If unable to authenticate with remote, provide a stable session stub for offline dev
      cachedUser = { id: '00000000-0000-0000-0000-000000000001', email: 'demo@kavach.local' };
      return cachedUser;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

export async function getSupabaseUserId() {
  const user = await ensureAuthenticated();
  return user.id;
}

// Map database row to canonical app device shape
function mapDeviceRecord(record) {
  if (!record) return null;
  const devId = record.deviceId || record.id || DEVICE_ID;

  // Sensor health: true if 'ok', false if 'fault', null if undefined/missing (renders 'Unknown')
  let mpuOk = null;
  if (record.mpuOk !== undefined) {
    mpuOk = record.mpuOk;
  } else if (record.sensor_status === 'ok' || record.sensorStatus === 'ok') {
    mpuOk = true;
  } else if (record.sensor_status === 'fault' || record.sensorStatus === 'fault') {
    mpuOk = false;
  }

  // GSM health: true if 'connected', false if 'disconnected', null if undefined/missing (renders 'Unknown')
  let gsmRegistered = null;
  if (record.gsmRegistered !== undefined) {
    gsmRegistered = record.gsmRegistered;
  } else if (record.gsm_status === 'connected' || record.gsmStatus === 'connected') {
    gsmRegistered = true;
  } else if (record.gsm_status === 'disconnected' || record.gsmStatus === 'disconnected') {
    gsmRegistered = false;
  }

  const rawBattery = record.batteryLevel ?? record.battery_percentage;
  const batteryLevel = rawBattery != null ? Number(rawBattery) : null;

  return {
    id: devId,
    deviceId: devId,
    deviceName: record.deviceName || record.name || 'Kavach Smart Helmet',
    batteryLevel,
    helmetStatus: record.helmetStatus || record.helmet_status || 'disconnected',
    accidentStatus: record.accidentStatus || record.accident_status || 'normal',
    gpsValid: Boolean(record.gpsValid ?? record.gps_valid),
    latitude: record.latitude != null ? Number(record.latitude) : null,
    longitude: record.longitude != null ? Number(record.longitude) : null,
    gpsLastFixAt: record.gpsLastFixAt || record.gps_last_fix_at || record.recorded_at || null,
    mpuOk,
    gsmRegistered,
    sensorStatus: record.sensorStatus || record.sensor_status || (mpuOk === true ? 'ok' : mpuOk === false ? 'fault' : null),
    gsmStatus: record.gsmStatus || record.gsm_status || (gsmRegistered === true ? 'connected' : gsmRegistered === false ? 'disconnected' : null),
    lastUpdated: record.lastUpdated
      ? (typeof record.lastUpdated === 'number' ? record.lastUpdated : new Date(record.lastUpdated).getTime())
      : (record.recorded_at ? new Date(record.recorded_at).getTime() : Date.now()),
  };
}

// Fetch current device state from database
async function fetchCurrentDevice() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Try helper view first
  const { data: viewData, error: viewError } = await supabase
    .from('v_latest_helmet_state')
    .select('*')
    .eq('deviceId', DEVICE_ID)
    .maybeSingle();

  if (!viewError && viewData) {
    return mapDeviceRecord(viewData);
  }

  // Direct table query fallback
  const { data: helmet, error: helmetError } = await supabase
    .from('helmets')
    .select('*')
    .eq('id', DEVICE_ID)
    .maybeSingle();

  if (helmetError || !helmet) return null;

  const [{ data: telemetry }, { data: location }] = await Promise.all([
    supabase
      .from('helmet_telemetry')
      .select('*')
      .eq('helmet_id', DEVICE_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('helmet_locations')
      .select('*')
      .eq('helmet_id', DEVICE_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return mapDeviceRecord({
    id: helmet.id,
    deviceId: helmet.id,
    deviceName: helmet.name,
    batteryLevel: telemetry?.battery_percentage,
    helmetStatus: telemetry?.helmet_status ?? 'disconnected',
    accidentStatus: telemetry?.accident_status ?? 'normal',
    sensorStatus: telemetry?.sensor_status,
    gsmStatus: telemetry?.gsm_status,
    gpsValid: location?.gps_valid ?? false,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    gpsLastFixAt: location?.recorded_at ?? null,
    lastUpdated: telemetry?.recorded_at || location?.recorded_at || helmet.updated_at,
  });
}

// -----------------------------------------------------------------------------
// Multiplexed Subscription Manager
// Prevents duplicate channel subscriptions, registers .on() before .subscribe(),
// provides fallback polling on connection error/timeout, and cleans up on unmount.
// -----------------------------------------------------------------------------
function createSubscriptionManager({
  name,
  fetchFn,
  setupChannel,
  pollIntervalMs = 15000,
}) {
  const listeners = new Set();
  let currentData = null;
  let hasData = false;
  let channel = null;
  let pollTimer = null;
  let inFlightPromise = null;
  let initPromise = null;

  async function executeFetch() {
    const data = await fetchFn();
    currentData = data;
    hasData = true;
    listeners.forEach(({ onData }) => {
      try {
        onData(currentData);
      } catch (e) {
        console.error(`[Supabase ${name}] listener error:`, e);
      }
    });
    return data;
  }

  async function doFetch(silent = false) {
    if (inFlightPromise) {
      try {
        return await inFlightPromise;
      } catch (err) {
        if (!silent) throw err;
        return currentData;
      }
    }

    inFlightPromise = executeFetch()
      .catch((err) => {
        if (!silent) {
          listeners.forEach(({ onError }) => {
            try {
              onError?.(err);
            } catch (_) {}
          });
        }
        throw err;
      })
      .finally(() => {
        inFlightPromise = null;
      });

    return inFlightPromise;
  }

  async function refresh() {
    if (inFlightPromise) {
      try {
        await inFlightPromise;
      } catch (_) {}
    }
    return doFetch(false);
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      doFetch(true).catch(() => {});
    }, pollIntervalMs);
    if (pollTimer.unref) pollTimer.unref();
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function teardown() {
    stopPolling();
    if (channel) {
      const supabase = getSupabaseClient();
      try {
        if (supabase) supabase.removeChannel(channel);
      } catch (_) {}
      channel = null;
    }
    initPromise = null;
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        checkConfigured();
        await ensureAuthenticated();
        if (listeners.size === 0) return;

        // Fetch initial data first
        await doFetch(false);
        if (listeners.size === 0) return;

        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Generate unique channel topic per active lifecycle to avoid client-side collision
        const topic = `rt-${name}-${DEVICE_ID}-${Date.now()}`;
        channel = setupChannel(
          supabase,
          topic,
          () => {
            doFetch(true).catch(() => {});
          },
          (status, _err) => {
            if (status === 'SUBSCRIBED') {
              stopPolling();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn(`[Supabase ${name}] Realtime subscription status: ${status}. Fallback polling active.`);
              startPolling();
            } else if (status === 'CLOSED') {
              // closed
            }
          }
        );
      } catch (err) {
        startPolling();
        listeners.forEach(({ onError }) => {
          try {
            onError?.(err);
          } catch (_) {}
        });
      }
    })();
    return initPromise;
  }

  function subscribe(onData, onError) {
    const entry = { onData, onError };
    listeners.add(entry);

    // Deliver cached data immediately if available
    if (hasData) {
      try {
        onData(currentData);
      } catch (e) {
        console.error(`[Supabase ${name}] onData error:`, e);
      }
    }

    if (listeners.size === 1) {
      init();
    }

    return () => {
      listeners.delete(entry);
      if (listeners.size === 0) {
        teardown();
      }
    };
  }

  return {
    subscribe,
    refresh,
    notifyMutation: async (optimisticData) => {
      if (optimisticData !== undefined) {
        currentData = optimisticData;
        hasData = true;
        listeners.forEach(({ onData }) => {
          try {
            onData(currentData);
          } catch (_) {}
        });
      }
      return doFetch(true).catch(() => {});
    },
    getCurrentData: () => currentData,
    reset: () => {
      currentData = null;
      hasData = false;
      teardown();
    },
  };
}

// -----------------------------------------------------------------------------
// Device Manager
// -----------------------------------------------------------------------------
const deviceManager = createSubscriptionManager({
  name: 'device',
  fetchFn: fetchCurrentDevice,
  setupChannel: (supabase, topic, onUpdate, onStatusChange) => {
    const ch = supabase.channel(topic);
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'helmet_telemetry', filter: `helmet_id=eq.${DEVICE_ID}` },
      onUpdate
    );
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'helmet_locations', filter: `helmet_id=eq.${DEVICE_ID}` },
      onUpdate
    );
    ch.subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err);
    });
    return ch;
  },
});

export function subscribeDevice(onData, onError) {
  return deviceManager.subscribe(onData, onError);
}

export async function refreshDevice() {
  checkConfigured();
  await ensureAuthenticated();
  return deviceManager.refresh();
}

// -----------------------------------------------------------------------------
// App Info
// -----------------------------------------------------------------------------
export function subscribeApp(onData, onError) {
  let isMounted = true;
  let interval = null;

  try {
    checkConfigured();
    onData({
      dataSource: 'live',
      backendReachable: true,
    });

    // Heartbeat check for Supabase reachability
    interval = setInterval(async () => {
      if (!isMounted) return;
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) onData({ dataSource: 'live', backendReachable: false });
        return;
      }
      try {
        const { error } = await supabase.from('helmets').select('id').limit(1);
        if (isMounted) {
          onData({ dataSource: 'live', backendReachable: !error });
        }
      } catch (_) {
        if (isMounted) onData({ dataSource: 'live', backendReachable: false });
      }
    }, 15000);
    if (interval.unref) interval.unref();
  } catch (error) {
    if (onError) onError(error);
    else console.error('Supabase subscribeApp error:', error);
  }

  return () => {
    isMounted = false;
    if (interval) clearInterval(interval);
  };
}

// -----------------------------------------------------------------------------
// Alerts
// -----------------------------------------------------------------------------
function mapAlertRecord(row) {
  return {
    id: String(row.id),
    timestamp: row.timestamp || new Date().toISOString(),
    severity: row.severity || 'high',
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    gpsValid: Boolean(row.gps_valid ?? row.gpsValid),
    status: row.status || 'new',
    smsStatus: row.sms_status || row.smsStatus || 'pending',
    deviceId: row.helmet_id || row.deviceId || DEVICE_ID,
  };
}

async function fetchAlertsList() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('accident_alerts')
    .select('*')
    .eq('helmet_id', DEVICE_ID)
    .order('timestamp', { ascending: false });

  if (error || !data) return [];
  return data.map(mapAlertRecord);
}

const alertsManager = createSubscriptionManager({
  name: 'alerts',
  fetchFn: fetchAlertsList,
  setupChannel: (supabase, topic, onUpdate, onStatusChange) => {
    const ch = supabase.channel(topic);
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'accident_alerts', filter: `helmet_id=eq.${DEVICE_ID}` },
      onUpdate
    );
    ch.subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err);
    });
    return ch;
  },
});

export function subscribeAlerts(onData, onError) {
  return alertsManager.subscribe(onData, onError);
}

export async function refreshAlerts() {
  checkConfigured();
  await ensureAuthenticated();
  return alertsManager.refresh();
}

export async function resolveAlert(id) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const { data: existing, error: findError } = await supabase
    .from('accident_alerts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !existing) {
    throw new ServiceError('NOT_FOUND', 'Alert not found.');
  }

  if (existing.status === 'resolved') return;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('accident_alerts')
    .update({
      status: 'resolved',
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq('id', id);

  if (updateError) {
    throw new ServiceError('RESOLVE_FAILED', updateError.message || 'Could not resolve the alert.');
  }

  // Record in in-app notification inbox
  await supabase.from('in_app_notifications').insert({
    user_id: user.id,
    type: 'alertUpdate',
    title: 'Alert resolved',
    body: 'You marked an accident alert as resolved.',
    timestamp: now,
    read: false,
    alert_id: String(id),
    device_id: DEVICE_ID,
  });

  // Locally notify managers for instant reactivity
  alertsManager.notifyMutation();
  notificationsManager.notifyMutation();
}

// -----------------------------------------------------------------------------
// Emergency Contacts
// -----------------------------------------------------------------------------
function mapContactRecord(row) {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    isPrimary: Boolean(row.is_primary),
  };
}

async function fetchContactsList(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map(mapContactRecord);
}

const contactsManager = createSubscriptionManager({
  name: 'contacts',
  fetchFn: async () => {
    const user = await ensureAuthenticated();
    return fetchContactsList(user.id);
  },
  setupChannel: (supabase, topic, onUpdate, onStatusChange) => {
    const ch = supabase.channel(topic);
    const userId = cachedUser?.id;
    const filter = userId
      ? { event: '*', schema: 'public', table: 'emergency_contacts', filter: `user_id=eq.${userId}` }
      : { event: '*', schema: 'public', table: 'emergency_contacts' };
    ch.on('postgres_changes', filter, onUpdate);
    ch.subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err);
    });
    return ch;
  },
});

export function subscribeContacts(onData, onError) {
  return contactsManager.subscribe(onData, onError);
}

export async function addContact(clean) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const current = await fetchContactsList(user.id);
  const isPrimary = current.length === 0;

  const { error } = await supabase.from('emergency_contacts').insert({
    user_id: user.id,
    name: clean.name,
    phone: clean.phone,
    is_primary: isPrimary,
  });

  if (error) {
    throw new Error(error.message || 'Could not save the emergency contact.');
  }

  contactsManager.notifyMutation();
}

export async function updateContact(id, clean) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const { data: existing, error: findError } = await supabase
    .from('emergency_contacts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError || !existing) {
    throw new ServiceError('NOT_FOUND', 'Contact not found.');
  }

  const { error } = await supabase
    .from('emergency_contacts')
    .update({
      name: clean.name,
      phone: clean.phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Could not update contact.');
  }

  contactsManager.notifyMutation();
}

export async function deleteContact(id) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const contacts = await fetchContactsList(user.id);
  const target = contacts.find((c) => c.id === id);
  if (!target) {
    throw new ServiceError('NOT_FOUND', 'Contact not found.');
  }

  const remaining = contacts.filter((c) => c.id !== id);

  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Could not delete contact.');
  }

  // If deleted contact was primary and remaining contacts exist, promote first remaining contact
  if (target.isPrimary && remaining.length > 0) {
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: true })
      .eq('id', remaining[0].id)
      .eq('user_id', user.id);
  }

  contactsManager.notifyMutation();
}

export async function setPrimary(id) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const contacts = await fetchContactsList(user.id);
  if (!contacts.some((c) => c.id === id)) {
    throw new ServiceError('NOT_FOUND', 'Contact not found.');
  }

  // Demote all contacts for this user
  await supabase
    .from('emergency_contacts')
    .update({ is_primary: false })
    .eq('user_id', user.id);

  // Promote target
  const { error } = await supabase
    .from('emergency_contacts')
    .update({ is_primary: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Could not set primary contact.');
  }

  contactsManager.notifyMutation();
}

// -----------------------------------------------------------------------------
// In-App Notifications
// -----------------------------------------------------------------------------
function mapNotificationRecord(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    timestamp: row.timestamp,
    read: Boolean(row.read),
    alertId: row.alert_id,
    deviceId: row.device_id,
  };
}

async function fetchNotificationsList(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('in_app_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error || !data) return [];
  return data.map(mapNotificationRecord);
}

const notificationsManager = createSubscriptionManager({
  name: 'notifications',
  fetchFn: async () => {
    const user = await ensureAuthenticated();
    return fetchNotificationsList(user.id);
  },
  setupChannel: (supabase, topic, onUpdate, onStatusChange) => {
    const ch = supabase.channel(topic);
    const userId = cachedUser?.id;
    const filter = userId
      ? { event: '*', schema: 'public', table: 'in_app_notifications', filter: `user_id=eq.${userId}` }
      : { event: '*', schema: 'public', table: 'in_app_notifications' };
    ch.on('postgres_changes', filter, onUpdate);
    ch.subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err);
    });
    return ch;
  },
});

export function subscribeNotifications(onData, onError) {
  return notificationsManager.subscribe(onData, onError);
}

export async function markRead(id) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('in_app_notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new ServiceError('NOT_FOUND', 'Notification not found.');
  }

  notificationsManager.notifyMutation();
}

export async function markAllRead() {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  await supabase
    .from('in_app_notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  notificationsManager.notifyMutation();
}

export async function clearAll() {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  await supabase
    .from('in_app_notifications')
    .delete()
    .eq('user_id', user.id);

  notificationsManager.notifyMutation();
}

export async function createInAppNotification({ type, title, body, alertId, deviceId }) {
  checkConfigured();
  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const row = {
    user_id: user.id,
    type: type || 'alertUpdate',
    title: title || 'Notification',
    body: body || '',
    alert_id: alertId ? String(alertId) : null,
    device_id: deviceId ? String(deviceId) : DEVICE_ID,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const { data, error } = await supabase
    .from('in_app_notifications')
    .insert(row)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not insert in-app notification.');
  }

  notificationsManager.notifyMutation();
  return data ? mapNotificationRecord(data) : null;
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
function mapSettingsRecord(row) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    accidentThreshold: row.accident_threshold ?? null,
    notifications: {
      push: row.notifications_push ?? true,
      sound: row.notifications_sound ?? true,
    },
  };
}

async function fetchSettings(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from('device_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;
  return mapSettingsRecord(data);
}

const settingsManager = createSubscriptionManager({
  name: 'settings',
  fetchFn: async () => {
    const user = await ensureAuthenticated();
    return fetchSettings(user.id);
  },
  setupChannel: (supabase, topic, onUpdate, onStatusChange) => {
    const ch = supabase.channel(topic);
    const userId = cachedUser?.id;
    const filter = userId
      ? { event: '*', schema: 'public', table: 'device_settings', filter: `user_id=eq.${userId}` }
      : { event: '*', schema: 'public', table: 'device_settings' };
    ch.on('postgres_changes', filter, onUpdate);
    ch.subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err);
    });
    return ch;
  },
});

export function subscribeSettings(onData, onError) {
  return settingsManager.subscribe(onData, onError);
}

export async function updateSettings(patch) {
  checkConfigured();
  if (!patch || typeof patch !== 'object' || 'accidentThreshold' in patch) {
    throw new ServiceError('UNSUPPORTED', 'The accident detection threshold cannot be changed from the app.');
  }

  const notifications = patch.notifications || {};
  const keys = Object.keys(notifications);
  if (
    keys.some((key) => !['push', 'sound'].includes(key)) ||
    keys.some((key) => typeof notifications[key] !== 'boolean')
  ) {
    throw new ServiceError('INVALID_SETTINGS', 'Notification settings must use boolean push and sound values.');
  }
  if (!keys.length) return;

  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  const updates = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if ('push' in notifications) updates.notifications_push = notifications.push;
  if ('sound' in notifications) updates.notifications_sound = notifications.sound;

  const { error } = await supabase
    .from('device_settings')
    .upsert(updates, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message || 'Could not update settings.');
  }

  settingsManager.notifyMutation();
}

// -----------------------------------------------------------------------------
// Expo Push Tokens
// -----------------------------------------------------------------------------
export async function saveExpoPushToken(token, platform) {
  checkConfigured();
  if (!token) throw new ServiceError('INVALID_TOKEN', 'Cannot register an empty push token.');
  if (platform !== 'android' && platform !== 'ios') {
    throw new ServiceError('UNSUPPORTED_PLATFORM', `Push notifications are not supported on ${platform}.`);
  }

  const user = await ensureAuthenticated();
  const supabase = getSupabaseClient();

  await supabase.from('push_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' }
  );
}

// -----------------------------------------------------------------------------
// Auth helpers for screens
// -----------------------------------------------------------------------------
export async function signIn(email, password) {
  checkConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  cachedUser = data.user;
  __resetManagers();
  return data;
}

export async function signUp(email, password, name = 'Kavach Rider') {
  checkConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  cachedUser = data.user;
  __resetManagers();
  return data;
}

export async function signOut() {
  checkConfigured();
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  cachedUser = null;
  __resetManagers();
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription?.unsubscribe();
}

export function __resetManagers() {
  deviceManager.reset();
  alertsManager.reset();
  contactsManager.reset();
  notificationsManager.reset();
  settingsManager.reset();
}

export { DEVICE_ID };
