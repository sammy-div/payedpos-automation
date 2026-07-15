const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

/**
 * AnalyticsEngine - Generic data analysis and aggregation
 * 
 * Supports:
 * - Count records
 * - Group by any field
 * - Sort ascending/descending
 * - Detect duplicates
 * - Detect missing values
 * - Frequency analysis
 * - Statistical calculations
 * - Top N results
 */
class AnalyticsEngine {
  /**
   * Get basic statistics about a dataset
   */
  static analyze(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        total: 0,
        fields: [],
        isEmpty: true
      };
    }

    logger.info('analytics.analyze', { recordCount: data.length });

    const stats = {
      total: data.length,
      fields: Object.keys(data[0]) || [],
      isEmpty: false,
      fieldCount: Object.keys(data[0])?.length || 0,
      timestamp: new Date().toISOString()
    };

    return stats;
  }

  /**
   * Count total records
   */
  static count(data) {
    const total = Array.isArray(data) ? data.length : 0;
    logger.info('analytics.count', { total });
    return { total, timestamp: new Date().toISOString() };
  }

  /**
   * Count records by a specific field (frequency analysis)
   */
  static countBy(data, fieldName) {
    if (!Array.isArray(data)) return {};

    logger.info('analytics.countBy', { field: fieldName });

    const counts = {};
    for (const record of data) {
      const value = record[fieldName];
      if (value !== null && value !== undefined) {
        const key = String(value).trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    return {
      field: fieldName,
      values: counts,
      uniqueCount: Object.keys(counts).length,
      total: data.length
    };
  }

  /**
   * Group records by a field
   */
  static groupBy(data, fieldName) {
    if (!Array.isArray(data)) return {};

    logger.info('analytics.groupBy', { field: fieldName });

    const groups = {};
    for (const record of data) {
      const value = record[fieldName];
      const key = value !== null && value !== undefined ? String(value).trim() : 'null';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    }

    const result = {
      field: fieldName,
      groups: {},
      groupCount: Object.keys(groups).length,
      total: data.length
    };

    // Add size information for each group
    for (const [key, records] of Object.entries(groups)) {
      result.groups[key] = {
        count: records.length,
        records
      };
    }

    return result;
  }

  /**
   * Sort records by field
   */
  static sort(data, fieldName, direction = 'asc') {
    if (!Array.isArray(data)) return [];

    logger.info('analytics.sort', { field: fieldName, direction });

    const sorted = [...data].sort((a, b) => {
      const aVal = a[fieldName];
      const bVal = b[fieldName];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;

      // Try numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return direction === 'asc' ? cmp : -cmp;
    });

    return {
      field: fieldName,
      direction,
      recordCount: sorted.length,
      data: sorted
    };
  }

  /**
   * Get top N records
   */
  static topN(data, fieldName, n = 10, direction = 'desc') {
    if (!Array.isArray(data)) return [];

    logger.info('analytics.topN', { field: fieldName, n, direction });

    const result = this.sort(data, fieldName, direction);
    const topRecords = result.data.slice(0, n);

    return {
      field: fieldName,
      n,
      direction,
      count: topRecords.length,
      data: topRecords
    };
  }

  /**
   * Detect and report duplicate records
   */
  static detectDuplicates(data, fieldNames = null) {
    if (!Array.isArray(data)) return { duplicates: [], hasDuplicates: false };

    logger.info('analytics.detectDuplicates');

    const fields = fieldNames || Object.keys(data[0] || {});
    const seen = {};
    const duplicates = [];

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const key = fields.map(f => String(record[f] || '')).join('|');

      if (seen[key]) {
        duplicates.push({
          recordIndices: [seen[key], i],
          records: [data[seen[key]], record],
          duplicatedFields: fields
        });
      } else {
        seen[key] = i;
      }
    }

    return {
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      fields: fields,
      duplicates
    };
  }

  /**
   * Detect and report missing values
   */
  static detectMissingValues(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { fields: {}, totalRecords: 0 };
    }

    logger.info('analytics.detectMissingValues');

    const fieldAnalysis = {};
    const firstRecord = data[0];

    for (const field of Object.keys(firstRecord)) {
      const missing = [];
      let missingCount = 0;

      for (let i = 0; i < data.length; i++) {
        const value = data[i][field];
        if (value === null || value === undefined || String(value).trim() === '') {
          missingCount++;
          missing.push(i);
        }
      }

      fieldAnalysis[field] = {
        totalMissing: missingCount,
        percentage: ((missingCount / data.length) * 100).toFixed(2),
        missingIndices: missing
      };
    }

    return {
      fields: fieldAnalysis,
      totalRecords: data.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Filter records by criteria
   */
  static filter(data, predicate) {
    if (!Array.isArray(data)) return [];

    logger.info('analytics.filter');

    if (typeof predicate !== 'function') {
      throw new AutomationError('Filter predicate must be a function');
    }

    const filtered = data.filter(predicate);

    return {
      originalCount: data.length,
      filteredCount: filtered.length,
      data: filtered
    };
  }

  /**
   * Advanced filter by multiple conditions
   */
  static filterByConditions(data, conditions) {
    if (!Array.isArray(data)) return [];

    logger.info('analytics.filterByConditions', { conditionCount: conditions.length });

    const filtered = data.filter(record => {
      return conditions.every(condition => {
        const { field, operator, value } = condition;
        const fieldValue = record[field];

        switch (operator) {
          case 'equals':
            return String(fieldValue) === String(value);
          case 'notEquals':
            return String(fieldValue) !== String(value);
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          case 'notContains':
            return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          case 'startsWith':
            return String(fieldValue).startsWith(String(value));
          case 'endsWith':
            return String(fieldValue).endsWith(String(value));
          case 'greaterThan':
            return Number(fieldValue) > Number(value);
          case 'lessThan':
            return Number(fieldValue) < Number(value);
          case 'greaterThanOrEqual':
            return Number(fieldValue) >= Number(value);
          case 'lessThanOrEqual':
            return Number(fieldValue) <= Number(value);
          case 'isEmpty':
            return fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '';
          case 'notEmpty':
            return fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '';
          case 'in':
            return Array.isArray(value) && value.includes(String(fieldValue));
          default:
            return true;
        }
      });
    });

    return {
      originalCount: data.length,
      filteredCount: filtered.length,
      conditions,
      data: filtered
    };
  }

  /**
   * Generate summary report
   */
  static summarize(data, groupField = null) {
    logger.info('analytics.summarize', { groupField });

    const summary = {
      total: data.length,
      fields: Object.keys(data[0] || {}),
      fieldCount: Object.keys(data[0] || {}).length,
      timestamp: new Date().toISOString()
    };

    if (groupField) {
      const grouped = this.groupBy(data, groupField);
      summary.groupedBy = groupField;
      summary.groups = {};

      for (const [key, info] of Object.entries(grouped.groups)) {
        summary.groups[key] = {
          count: info.count,
          percentage: ((info.count / data.length) * 100).toFixed(2)
        };
      }
    }

    return summary;
  }

  /**
   * Compare two datasets
   */
  static compare(data1, data2, keyField) {
    logger.info('analytics.compare', { keyField });

    if (!Array.isArray(data1) || !Array.isArray(data2)) {
      return { error: 'Both datasets must be arrays' };
    }

    const map1 = new Map(data1.map(r => [r[keyField], r]));
    const map2 = new Map(data2.map(r => [r[keyField], r]));

    const added = [];
    const removed = [];
    const modified = [];

    // Find added and modified
    for (const [key, record2] of map2.entries()) {
      if (!map1.has(key)) {
        added.push(record2);
      } else {
        const record1 = map1.get(key);
        if (JSON.stringify(record1) !== JSON.stringify(record2)) {
          modified.push({ key, before: record1, after: record2 });
        }
      }
    }

    // Find removed
    for (const [key, record1] of map1.entries()) {
      if (!map2.has(key)) {
        removed.push(record1);
      }
    }

    return {
      keyField,
      dataset1Count: data1.length,
      dataset2Count: data2.length,
      added: { count: added.length, records: added },
      removed: { count: removed.length, records: removed },
      modified: { count: modified.length, records: modified },
      unchanged: map1.size - modified.length - removed.length
    };
  }

  /**
   * Extract specific columns
   */
  static selectColumns(data, columnNames) {
    logger.info('analytics.selectColumns', { columnCount: columnNames.length });

    return data.map(record => {
      const selected = {};
      for (const col of columnNames) {
        if (col in record) {
          selected[col] = record[col];
        }
      }
      return selected;
    });
  }

  /**
   * Generate statistics for numeric fields
   */
  static numericStats(data, fieldName) {
    logger.info('analytics.numericStats', { field: fieldName });

    const values = data
      .map(r => Number(r[fieldName]))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      return { field: fieldName, error: 'No numeric values found' };
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      field: fieldName,
      count: values.length,
      sum,
      average: avg.toFixed(2),
      median,
      min,
      max,
      range: max - min
    };
  }
}

module.exports = AnalyticsEngine;
