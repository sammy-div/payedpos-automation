const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

/**
 * SnapshotComparison - Compares snapshots and detects additions, removals,
 * and field-level changes over time.
 *
 * All methods are static; this module has no mutable state and never
 * modifies the snapshots it reads.
 */
class SnapshotComparison {
  /**
   * Load a single snapshot file from disk.
   * @param {string} filePath
   * @returns {object} Parsed snapshot payload
   */
  static loadSnapshot(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('snapshot.load.error', { filePath, message: error.message });
      throw new AutomationError(`Failed to load snapshot: ${filePath}`, { cause: error.message });
    }
  }

  /**
   * List all snapshot files in a directory, newest first.
   * @param {string} directory
   * @returns {Array<{fileName: string, filePath: string, size: number, savedAt: string|null}>}
   */
  static listSnapshots(directory) {
    if (!fs.existsSync(directory)) {
      return [];
    }

    return fs
      .readdirSync(directory)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => {
        const filePath = path.join(directory, fileName);
        const stats = fs.statSync(filePath);

        let savedAt = null;
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          savedAt = parsed.savedAt || parsed.generatedAt || null;
        } catch {
          // Corrupt or unreadable snapshot; still list it by file metadata.
        }

        return {
          fileName,
          filePath,
          size: stats.size,
          savedAt: savedAt || stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.fileName.localeCompare(a.fileName));
  }

  /**
   * Load the most recently saved snapshot in a directory.
   * @param {string} directory
   * @returns {object|null}
   */
  static loadLatestSnapshot(directory) {
    const snapshots = this.listSnapshots(directory);
    if (!snapshots.length) {
      return null;
    }
    return this.loadSnapshot(snapshots[0].filePath);
  }

  /**
   * Compare two already-loaded snapshots by a key field.
   * @param {object} snap1 - Earlier snapshot
   * @param {object} snap2 - Later snapshot
   * @param {object} options - { keyField }
   * @returns {object} { added, removed, modified, unchanged, keyField }
   */
  static compare(snap1, snap2, options = {}) {
    const rows1 = Array.isArray(snap1?.rows) ? snap1.rows : [];
    const rows2 = Array.isArray(snap2?.rows) ? snap2.rows : [];

    const keyField = options.keyField || this.inferKeyField(rows1[0], rows2[0]);

    const keyOf = (row, index) => (keyField && row[keyField] !== undefined ? String(row[keyField]) : `__index_${index}`);

    const map1 = new Map(rows1.map((row, index) => [keyOf(row, index), row]));
    const map2 = new Map(rows2.map((row, index) => [keyOf(row, index), row]));

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    for (const [key, row2] of map2.entries()) {
      if (!map1.has(key)) {
        added.push(row2);
        continue;
      }

      const row1 = map1.get(key);
      const changedFields = this.diffFields(row1, row2);

      if (changedFields.length) {
        modified.push({ key, before: row1, after: row2, changedFields });
      } else {
        unchanged.push(row2);
      }
    }

    for (const [key, row1] of map1.entries()) {
      if (!map2.has(key)) {
        removed.push(row1);
      }
    }

    return {
      keyField: keyField || null,
      totals: {
        before: rows1.length,
        after: rows2.length,
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        unchanged: unchanged.length
      },
      added,
      removed,
      modified,
      unchanged
    };
  }

  /**
   * Load two snapshot files and compare them.
   * @param {string} path1
   * @param {string} path2
   * @param {object} options - { keyField }
   * @returns {object} Comparison result
   */
  static compareFiles(path1, path2, options = {}) {
    const snap1 = this.loadSnapshot(path1);
    const snap2 = this.loadSnapshot(path2);
    return this.compare(snap1, snap2, options);
  }

  /**
   * Generate a human-readable summary report from a comparison result.
   * @param {object} comparison - Result from compare()/compareFiles()
   * @returns {object} { summary, details }
   */
  static generateReport(comparison) {
    const { totals, added, removed, modified } = comparison;

    const summaryLines = [
      `Snapshot comparison (key field: ${comparison.keyField || 'row index'})`,
      `Records before: ${totals.before}, after: ${totals.after}`,
      `Added: ${totals.added}, Removed: ${totals.removed}, Modified: ${totals.modified}, Unchanged: ${totals.unchanged}`
    ];

    return {
      summary: summaryLines.join('\n'),
      totals,
      added,
      removed,
      modified: modified.map((entry) => ({
        key: entry.key,
        changedFields: entry.changedFields
      }))
    };
  }

  /**
   * Walk every snapshot in a directory chronologically and report changes
   * between each consecutive pair.
   * @param {string} directory
   * @param {object} options - { keyField }
   * @returns {Array<object>} One comparison report per consecutive pair
   */
  static trackChangesOverTime(directory, options = {}) {
    const snapshots = this.listSnapshots(directory).sort((a, b) => a.fileName.localeCompare(b.fileName));

    const history = [];
    for (let i = 1; i < snapshots.length; i += 1) {
      const previous = snapshots[i - 1];
      const current = snapshots[i];
      const comparison = this.compareFiles(previous.filePath, current.filePath, options);

      history.push({
        from: previous.fileName,
        to: current.fileName,
        report: this.generateReport(comparison)
      });
    }

    return history;
  }

  /**
   * Save a comparison result to disk as JSON.
   * @param {object} comparison
   * @param {string} filePath
   */
  static exportToJson(comparison, filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(comparison, null, 2), 'utf-8');
      logger.info('snapshot.compare.export', { filePath });
      return filePath;
    } catch (error) {
      logger.error('snapshot.compare.export.error', { message: error.message });
      throw new AutomationError('Failed to export comparison', { cause: error.message });
    }
  }

  /**
   * Compare all fields on two rows and return the names that changed.
   * @private
   */
  static diffFields(row1, row2) {
    const keys = new Set([...Object.keys(row1 || {}), ...Object.keys(row2 || {})]);
    const changed = [];

    for (const key of keys) {
      const value1 = row1 ? row1[key] : undefined;
      const value2 = row2 ? row2[key] : undefined;
      if (String(value1 ?? '') !== String(value2 ?? '')) {
        changed.push({ field: key, before: value1 ?? null, after: value2 ?? null });
      }
    }

    return changed;
  }

  /**
   * Best-effort guess at a stable identity field shared by both snapshots.
   * @private
   */
  static inferKeyField(sampleRow1, sampleRow2) {
    if (!sampleRow1 || !sampleRow2) {
      return null;
    }

    const keys2 = new Set(Object.keys(sampleRow2));
    const sharedKeys = Object.keys(sampleRow1).filter((key) => keys2.has(key));

    // Generic pattern match rather than a hardcoded whitelist of
    // specific field names - real column names for most routes aren't
    // confirmed, and a whitelist of guessed names would just be wrong
    // for whichever route it didn't happen to guess correctly (as
    // "Transaction ID" was, before this fix). Verified against both
    // realistic identifier names (ID, Terminal ID, merchant_id,
    // transactionId, terminalID) and common false-positive words that
    // merely end in "id" (Paid, Void, Grid, Valid, Invalid, Solid,
    // Avoid, Kid, Squid) - none of the latter match.
    const idLike = sharedKeys.find(
      (key) => /(^|[\s_-])id$/i.test(key) || /[a-z]Id$/.test(key) || /[a-z]ID$/.test(key)
    );
    return idLike || null;
  }
}

module.exports = SnapshotComparison;
