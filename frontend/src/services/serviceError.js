// One error type for all services, so screens can show friendly messages by code.
// Codes: INVALID_NAME, INVALID_PHONE, DUPLICATE_PHONE, NOT_FOUND, UNSUPPORTED, LIVE_NOT_CONNECTED
export class ServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}
