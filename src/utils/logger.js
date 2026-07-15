const fs = require('fs');
const path = require('path');
const { ensureDirectory } = require('./file');
const { getConfig } = require('../config/env');

/**
 * Enhanced Logger with performance metrics and structured logging
 */
class Logger {
  constructor() {
    this.config = getConfig();
    this.logDir = this.config.logDir;
    ensureDirectory(this.logDir);
    this.logFilePath = path.join(this.logDir, 'automation.log');
    this.performanceFilePath = path.join(this.logDir, 'performance.log');
    this.performanceMetrics = new Map();
    this.startTime = Date.now();
  }

  /**
   * Format log entry with timestamp and metadata
   */
  formatEntry(level, event, meta = {}) {
    const timestamp = new Date().toISOString();
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    return JSON.stringify({
      timestamp,
      level,
      event,
      uptime,
      ...meta
    });
  }

  /**
   * Write log entry to file and console
   */
  write(level, event, meta = {}) {
    const entry = this.formatEntry(level, event, meta);
    fs.appendFileSync(this.logFilePath, `${entry}\n`);

    // Color-coded console output
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[35m',   // Magenta
      success: '\x1b[32m'  // Green
    };
    const resetColor = '\x1b[0m';
    const color = colors[level] || '';

    console.log(`${color}[${level.toUpperCase()}]${resetColor} ${event}`, meta);
  }

  info(event, meta = {}) {
    this.write('info', event, meta);
  }

  warn(event, meta = {}) {
    this.write('warn', event, meta);
  }

  error(event, meta = {}) {
    this.write('error', event, meta);
  }

  debug(event, meta = {}) {
    this.write('debug', event, meta);
  }

  success(event, meta = {}) {
    this.write('success', event, meta);
  }

  /**
   * Start measuring performance
   */
  startMetric(metricName) {
    this.performanceMetrics.set(metricName, {
      startTime: Date.now(),
      name: metricName
    });
    this.debug('metric.start', { metric: metricName });
  }

  /**
   * End measuring performance and log result
   */
  endMetric(metricName, meta = {}) {
    const metric = this.performanceMetrics.get(metricName);

    if (!metric) {
      this.warn('metric.notFound', { metric: metricName });
      return null;
    }

    const duration = Date.now() - metric.startTime;
    const result = {
      metric: metricName,
      duration,
      durationSeconds: (duration / 1000).toFixed(3),
      ...meta
    };

    this.info('metric.complete', result);
    this.logPerformance(result);
    this.performanceMetrics.delete(metricName);

    return result;
  }

  /**
   * Log performance metric to separate file
   */
  logPerformance(metric) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...metric
    });
    fs.appendFileSync(this.performanceFilePath, `${entry}\n`);
  }

  /**
   * Track async operation with automatic timing
   */
  async trackAsync(operationName, asyncFunction, context = {}) {
    this.startMetric(operationName);

    try {
      const result = await asyncFunction();
      this.endMetric(operationName, { status: 'success', ...context });
      return result;
    } catch (error) {
      this.endMetric(operationName, { status: 'error', error: error.message, ...context });
      throw error;
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, details = {}) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event,
      ...details
    });

    const securityLogPath = path.join(this.logDir, 'security.log');
    fs.appendFileSync(securityLogPath, `${entry}\n`);
    this.warn(`security.${event}`, details);
  }

  /**
   * Log extraction event
   */
  logExtraction(extractionType, details = {}) {
    this.info(`extraction.${extractionType}`, details);
  }

  /**
   * Log navigation event
   */
  logNavigation(route, url, details = {}) {
    this.info('navigation.visited', {
      route,
      url,
      ...details
    });
  }

  /**
   * Log pagination progress
   */
  logPagination(pageNumber, recordCount, details = {}) {
    this.debug('pagination.progress', {
      page: pageNumber,
      records: recordCount,
      ...details
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    if (!fs.existsSync(this.performanceFilePath)) {
      return { message: 'No performance data available' };
    }

    const lines = fs.readFileSync(this.performanceFilePath, 'utf-8').trim().split('\n');
    const metrics = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(m => m);

    if (metrics.length === 0) {
      return { message: 'No valid metrics' };
    }

    const summary = {
      totalMetrics: metrics.length,
      metrics: {}
    };

    for (const metric of metrics) {
      if (!summary.metrics[metric.metric]) {
        summary.metrics[metric.metric] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: 0,
          avg: 0
        };
      }

      const stats = summary.metrics[metric.metric];
      stats.count++;
      stats.total += metric.duration;
      stats.min = Math.min(stats.min, metric.duration);
      stats.max = Math.max(stats.max, metric.duration);
      stats.avg = stats.total / stats.count;
    }

    return summary;
  }

  /**
   * Get log summary
   */
  getSummary() {
    if (!fs.existsSync(this.logFilePath)) {
      return { message: 'No logs available' };
    }

    const content = fs.readFileSync(this.logFilePath, 'utf-8');
    const lines = content.trim().split('\n');

    const counts = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      success: 0
    };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        counts[entry.level]++;
      } catch {
        // Skip invalid lines
      }
    }

    return {
      totalLines: lines.length,
      levels: counts,
      uptime: Math.round((Date.now() - this.startTime) / 1000)
    };
  }
}

const logger = new Logger();
module.exports = logger;
