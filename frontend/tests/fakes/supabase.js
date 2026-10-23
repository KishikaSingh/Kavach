// Stand-in for '@supabase/supabase-js' in tests: in-memory PostgreSQL and Realtime.
const copy = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));

export const tables = {
  helmets: [],
  helmet_telemetry: [],
  helmet_locations: [],
  emergency_contacts: [],
  accident_alerts: [],
  sms_delivery_logs: [],
  device_settings: [],
  in_app_notifications: [],
  push_tokens: [],
  v_latest_helmet_state: [],
};

const realtimeChannels = [];
const activeChannels = new Map();

export function __reset(initial = {}) {
  Object.keys(tables).forEach((k) => {
    tables[k] = [];
  });
  Object.entries(initial).forEach(([k, v]) => {
    tables[k] = copy(v) || [];
  });
  realtimeChannels.length = 0;
  activeChannels.clear();
}

export function __writeTable(tableName, record) {
  if (!tables[tableName]) tables[tableName] = [];
  tables[tableName].push(copy(record));
  __notifyRealtime(tableName, 'INSERT', record);
}

export function __notifyRealtime(tableName, event, record) {
  realtimeChannels.forEach((chan) => {
    chan.listeners.forEach((listener) => {
      if (listener.table === tableName) {
        try {
          listener.callback({ eventType: event, new: copy(record), old: null });
        } catch (_) {}
      }
    });
  });
}

function createQueryBuilder(tableName) {
  const query = {
    _table: tableName,
    _op: 'SELECT',
    _filters: [],
    _orders: [],
    _limit: null,
    _payload: null,
    _maybeSingle: false,
    _single: false,
    select() {
      this._op = 'SELECT';
      return this;
    },
    insert(payload) {
      this._op = 'INSERT';
      this._payload = payload;
      return this;
    },
    update(payload) {
      this._op = 'UPDATE';
      this._payload = payload;
      return this;
    },
    upsert(payload, _opts) {
      this._op = 'UPSERT';
      this._payload = payload;
      return this;
    },
    delete() {
      this._op = 'DELETE';
      return this;
    },
    eq(column, value) {
      this._filters.push({ column, value });
      return this;
    },
    order(column, { ascending = true } = {}) {
      this._orders.push({ column, ascending });
      return this;
    },
    limit(n) {
      this._limit = n;
      return this;
    },
    maybeSingle() {
      this._maybeSingle = true;
      return this;
    },
    single() {
      this._single = true;
      return this;
    },
    async then(resolve, reject) {
      try {
        if (!tables[this._table]) tables[this._table] = [];
        let rows = tables[this._table];

        // Execute Operation
        if (this._op === 'INSERT') {
          const toInsert = Array.isArray(this._payload) ? this._payload : [this._payload];
          const inserted = toInsert.map((item) => {
            const row = { id: item.id || `gen-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...copy(item) };
            tables[this._table].push(row);
            __notifyRealtime(this._table, 'INSERT', row);
            return row;
          });
          return resolve({ data: Array.isArray(this._payload) ? inserted : inserted[0], error: null });
        }

        if (this._op === 'UPSERT') {
          const item = copy(this._payload);
          const index = tables[this._table].findIndex((r) => {
            if (item.user_id && r.user_id === item.user_id) return true;
            if (item.id && r.id === item.id) return true;
            return false;
          });
          let resultRow;
          if (index >= 0) {
            tables[this._table][index] = { ...tables[this._table][index], ...item };
            resultRow = tables[this._table][index];
            __notifyRealtime(this._table, 'UPDATE', resultRow);
          } else {
            resultRow = { id: item.id || `gen-${Date.now()}`, ...item };
            tables[this._table].push(resultRow);
            __notifyRealtime(this._table, 'INSERT', resultRow);
          }
          return resolve({ data: resultRow, error: null });
        }

        if (this._op === 'UPDATE') {
          let updatedCount = 0;
          tables[this._table] = tables[this._table].map((r) => {
            const matches = this._filters.every((f) => String(r[f.column]) === String(f.value));
            if (matches) {
              updatedCount += 1;
              const updated = { ...r, ...copy(this._payload) };
              __notifyRealtime(this._table, 'UPDATE', updated);
              return updated;
            }
            return r;
          });
          return resolve({ data: null, error: null, count: updatedCount });
        }

        if (this._op === 'DELETE') {
          const toKeep = [];
          tables[this._table].forEach((r) => {
            const matches = this._filters.every((f) => String(r[f.column]) === String(f.value));
            if (!matches) {
              toKeep.push(r);
            } else {
              __notifyRealtime(this._table, 'DELETE', r);
            }
          });
          tables[this._table] = toKeep;
          return resolve({ data: null, error: null });
        }

        // SELECT query
        let result = rows.filter((r) => {
          return this._filters.every((f) => String(r[f.column]) === String(f.value));
        });

        this._orders.forEach(({ column, ascending }) => {
          result.sort((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
          });
        });

        if (this._limit !== null) {
          result = result.slice(0, this._limit);
        }

        if (this._maybeSingle || this._single) {
          const singleItem = result.length > 0 ? copy(result[0]) : null;
          return resolve({ data: singleItem, error: null });
        }

        return resolve({ data: copy(result), error: null });
      } catch (err) {
        if (reject) reject(err);
        else resolve({ data: null, error: err });
      }
    },
  };
  return query;
}

export function createClient(url, key, _options = {}) {
  const defaultUser = {
    id: 'test-user-1',
    email: 'demo@kavach.local',
    user_metadata: { name: 'Kavach Test Rider' },
  };

  return {
    auth: {
      currentUser: defaultUser,
      async getSession() {
        return { data: { session: { user: defaultUser } }, error: null };
      },
      async getUser() {
        return { data: { user: defaultUser }, error: null };
      },
      async signInWithPassword({ email }) {
        return { data: { user: { ...defaultUser, email } }, error: null };
      },
      async signInAnonymously() {
        return { data: { user: defaultUser }, error: null };
      },
      async signUp({ email, options }) {
        return { data: { user: { ...defaultUser, email, ...options?.data } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      onAuthStateChange(_cb) {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from(table) {
      return createQueryBuilder(table);
    },
    channel(name) {
      if (activeChannels.has(name)) {
        return activeChannels.get(name);
      }
      const channelObj = {
        name,
        state: 'closed',
        listeners: [],
        on(_type, filter, callback) {
          if (this.state === 'joined') {
            throw new Error(`cannot add postgres_changes callbacks for realtime:${name} after subscribe().`);
          }
          this.listeners.push({ table: filter.table, callback });
          return this;
        },
        subscribe(statusCb) {
          this.state = 'joined';
          if (!realtimeChannels.includes(this)) {
            realtimeChannels.push(this);
          }
          if (statusCb) statusCb('SUBSCRIBED');
          return this;
        },
      };
      activeChannels.set(name, channelObj);
      return channelObj;
    },
    removeChannel(chan) {
      const targetName = typeof chan === 'string' ? chan : chan?.name;
      if (targetName && activeChannels.has(targetName)) {
        const ch = activeChannels.get(targetName);
        ch.state = 'closed';
        activeChannels.delete(targetName);
        const idx = realtimeChannels.indexOf(ch);
        if (idx >= 0) realtimeChannels.splice(idx, 1);
      }
    },
  };
}
