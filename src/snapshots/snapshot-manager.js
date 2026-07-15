const path = require('path');
const fs = require('fs');
const { getConfig } = require('../config/env');
const { ensureDirectory, getTimestampedFileName } = require('../utils/file');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

/**
 * SnapshotManager - Saves timestamped JSON snapshots of extracted data.
 *
 * Snapshots supplement live data but never replace it: every automation run
 * reads live data first, and a snapshot is simply a point-in-time record of
 * what was read, kept for historical comparison (see SnapshotComparison).
 */
class SnapshotManager {
  constructor() {
    this.config = getConfig();
    ensureDirectory(this.config.snapshotDir);
  }

  /**
   * Save a snapshot to disk.
   * @param {object} data - Arbitrary snapshot payload (route, rows, metadata, etc.)
   * @returns {string} Absolute path to the saved snapshot file
   */
  save(data) {
    try {
      const fileName = getTimestampedFileName('snapshot', 'json');
      const filePath = path.join(this.config.snapshotDir, fileName);

      const payload = {
        savedAt: new Date().toISOString(),
        ...data
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      logger.info('snapshot.save', { filePath, rowCount: Array.isArray(data?.rows) ? data.rows.length : undefined });

      return filePath;
    } catch (error) {
      logger.error('snapshot.save.error', { message: error.message });
      throw new AutomationError('Failed to save snapshot', { cause: error.message });
    }
  }
}

module.exports = SnapshotManager;
