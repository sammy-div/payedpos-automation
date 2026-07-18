/**
 * Shared utilities for the GitHub-Actions-triggered automation run.
 *
 * Deliberately reuses the existing src/utils/logger.js rather than
 * building a new one: it already writes structured JSON to
 * logs/automation.log (which the workflow uploads as an artifact on
 * failure) and prints color-coded output straight into the Actions run
 * log via console.log - exactly what's needed here, nothing new required.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logger = require('../src/utils/logger');

export interface LogMeta {
  [key: string]: unknown;
}

export const log = {
  info: (event: string, meta: LogMeta = {}) => logger.info(event, meta),
  warn: (event: string, meta: LogMeta = {}) => logger.warn(event, meta),
  error: (event: string, meta: LogMeta = {}) => logger.error(event, meta),
  success: (event: string, meta: LogMeta = {}) => logger.success(event, meta),
};

/**
 * Fields that must never appear in a log line, even nested inside a
 * larger metadata object. Redacts by key name, not by value, since
 * matching secret values directly would require knowing them in advance
 * at every call site - matching known-sensitive keys is more reliable.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'PAYEDPOS_PASSWORD',
  'token',
  'GITHUB_TOKEN',
  'secret',
  'INGEST_API_SECRET',
  'REFRESH_TRIGGER_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'authorization',
  'cookie',
  'storageState',
]);

/**
 * Deep-redacts any object before logging it, replacing sensitive values
 * with a fixed placeholder rather than omitting the key (so it's still
 * visible *that* a value was present, without revealing it).
 */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redact(val);
    }
    return result;
  }

  return value;
}

/**
 * Reads a required environment variable, throwing a clear, specific
 * error immediately if it's missing rather than letting a cryptic
 * downstream failure (e.g. "Cannot read property of undefined") surface
 * later in the run.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

export interface AutomationEnv {
  route: string;
  ingestApiUrl: string;
  ingestApiSecret: string;
  githubRunId: string | null;
  triggeredBy: 'manual' | 'schedule' | 'api';
}

/**
 * Validates and collects every environment variable this run needs that
 * isn't already covered by src/config/env.js (PAYEDPOS_BASE_URL,
 * PAYEDPOS_LOGIN_PATH, PAYEDPOS_USERNAME, PAYEDPOS_PASSWORD, etc. - those
 * are validated separately by AuthManager, which already throws a clear
 * error if credentials are missing).
 */
export function getAutomationEnv(): AutomationEnv {
  const route = requireEnv('AUTOMATION_ROUTE');
  const ingestApiUrl = requireEnv('INGEST_API_URL');
  const ingestApiSecret = requireEnv('INGEST_API_SECRET');
  const triggeredBy = optionalEnv('AUTOMATION_TRIGGERED_BY', 'manual') as AutomationEnv['triggeredBy'];

  if (!['manual', 'schedule', 'api'].includes(triggeredBy)) {
    throw new Error(`AUTOMATION_TRIGGERED_BY must be one of manual|schedule|api, got: ${triggeredBy}`);
  }

  return {
    route,
    ingestApiUrl,
    ingestApiSecret,
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
    triggeredBy,
  };
}
