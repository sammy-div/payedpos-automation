require('dotenv').config();
const path = require('path');

function parseBoolean(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseViewport(value) {
  if (!value) {
    return { width: 1440, height: 900 };
  }

  const [width, height] = value.split(',').map((part) => Number(part.trim()));
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height };
  }

  return { width: 1440, height: 900 };
}

function getConfig() {
  return {
    baseUrl: process.env.PAYEDPOS_BASE_URL || 'https://payedpos.vercel.app',
    username: process.env.PAYEDPOS_USERNAME || '',
    password: process.env.PAYEDPOS_PASSWORD || '',
    headless: parseBoolean(process.env.PAYEDPOS_HEADLESS, true),
    viewport: parseViewport(process.env.PAYEDPOS_VIEWPORT),
    timeout: Number(process.env.PAYEDPOS_TIMEOUT || 30000),
    maxRetries: Number(process.env.PAYEDPOS_MAX_RETRIES || 2),
    storageStatePath: process.env.PAYEDPOS_STORAGE_STATE_PATH || path.resolve(process.cwd(), 'storage', 'auth-state.json'),
    outputDir: process.env.PAYEDPOS_OUTPUT_DIR || path.resolve(process.cwd(), 'output'),
    snapshotDir: process.env.PAYEDPOS_SNAPSHOT_DIR || path.resolve(process.cwd(), 'snapshots'),
    logDir: process.env.PAYEDPOS_LOG_DIR || path.resolve(process.cwd(), 'logs')
  };
}

module.exports = { getConfig };
