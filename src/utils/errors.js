class AutomationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AutomationError';
    this.details = details;
  }
}

module.exports = { AutomationError };
