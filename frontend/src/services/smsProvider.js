// ==============================================================================
// KAVACH SMART HELMET — EMERGENCY SMS PROVIDER INTERFACE & IMPLEMENTATIONS
// ==============================================================================
// Clean, decoupled SMS provider abstraction:
//   1. SmsProvider (Abstract base contract)
//   2. SimulatedSmsProvider (Default for demonstrations; 100% safe, no cost, no hardware)
//   3. HttpGatewaySmsProvider (Pluggable HTTP gateway for real cellular SMS if configured)
// ==============================================================================

export class SmsProvider {
  /**
   * @param {Object} options
   * @param {string} options.alertId
   * @param {Array<{id: string, name: string, phone: string}>} options.recipients
   * @param {string} options.message
   * @param {Object} options.location
   * @param {Object} [options.alert]
   * @param {number} [options.confidence]
   * @param {string} [options.user]
   * @returns {Promise<{status: string, channel: string, provider: string, recipients: Array, message: string, timestamp: string, reason?: string, note?: string, error?: string}>}
   */
  async dispatch(_options) {
    throw new Error('SmsProvider.dispatch must be implemented by subclass.');
  }
}

/**
 * Default Simulated SMS Provider for College Demonstrations.
 * Guarantees zero real SMS messages are ever sent, preventing carrier charges or spam.
 * Explicitly marks delivery as simulated ('demo_sent').
 */
export class SimulatedSmsProvider extends SmsProvider {
  async dispatch({ alertId, recipients, message }) {
    return {
      alertId,
      status: 'demo_sent',
      channel: 'simulated_sms',
      provider: 'simulation',
      recipients: Array.isArray(recipients) ? recipients : [],
      message,
      note: 'Demo mode: Emergency contacts alert simulated.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Pluggable HTTP Gateway SMS Provider.
 * Connects to a standard JSON webhook or external cellular SMS gateway when configured.
 */
export class HttpGatewaySmsProvider extends SmsProvider {
  constructor({ gatewayUrl, apiKey } = {}) {
    super();
    this.gatewayUrl = gatewayUrl || null;
    this.apiKey = apiKey || null;
  }

  async dispatch({ alertId, recipients, message, location, alert, confidence, user }) {
    if (!this.gatewayUrl) {
      return {
        alertId,
        status: 'unconfigured',
        channel: 'manual_fallback',
        provider: 'none',
        recipients: Array.isArray(recipients) ? recipients : [],
        message,
        reason: 'Emergency SMS gateway is not configured. Set EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL.',
        timestamp: new Date().toISOString(),
      };
    }

    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}`, 'x-api-key': this.apiKey } : {}),
      },
      body: JSON.stringify({
        alertId,
        timestamp: alert?.timestamp || new Date().toISOString(),
        severity: alert?.severity,
        confidence,
        user: user || 'Helmet Rider',
        recipients,
        message,
        location,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`SMS gateway error HTTP ${response.status}: ${errText || response.statusText}`);
    }

    return {
      alertId,
      status: 'sent',
      channel: 'gateway',
      provider: 'http_gateway',
      recipients: Array.isArray(recipients) ? recipients : [],
      message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Provider factory: returns the active SMS provider based on environment and options.
 */
export function getSmsProvider(options = {}) {
  // If an explicit gateway URL is provided (e.g. in tests or custom config), prioritize HTTP gateway
  if (options.gatewayUrl) {
    return new HttpGatewaySmsProvider({
      gatewayUrl: options.gatewayUrl,
      apiKey: options.apiKey || process.env.EXPO_PUBLIC_EMERGENCY_SMS_API_KEY,
    });
  }

  // If explicitly flagged as demo or in demo mode without live flag
  const isDemo = options.isDemo ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'demo' && !options.isLive);
  if (isDemo) {
    return new SimulatedSmsProvider();
  }

  const envGatewayUrl = process.env.EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL;
  if (envGatewayUrl) {
    return new HttpGatewaySmsProvider({
      gatewayUrl: envGatewayUrl,
      apiKey: options.apiKey || process.env.EXPO_PUBLIC_EMERGENCY_SMS_API_KEY,
    });
  }

  const isLive = options.isLive ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'live');
  if (isLive) {
    return new HttpGatewaySmsProvider({ gatewayUrl: null, apiKey: null });
  }

  return new SimulatedSmsProvider();
}
