const express = require('express');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('./config/env');
const logger = require('./utils/logger');

// Import all modules
const BrowserManager = require('./browser/browser-manager');
const AuthManager = require('./browser/auth/auth-manager');
const { NavigationRouter } = require('./browser/navigation/router');
const PaginationEngine = require('./browser/pagination/pagination-engine');
const TableExtractor = require('./browser/extractors/table-extractor');
const DetailExtractor = require('./browser/extractors/detail-extractor');
const SearchEngine = require('./browser/search/search-engine');
const ExcelReportGenerator = require('./reports/excel/report-generator');
const WordReportGenerator = require('./reports/word/report-generator');
const SnapshotManager = require('./snapshots/snapshot-manager');
const SnapshotComparison = require('./snapshots/snapshot-comparison');
const AnalyticsEngine = require('./analytics/analytics-engine');
const GenericCommand = require('./commands/generic-command');
const SafetyLayer = require('./security/safety-layer');

const app = express();
const config = getConfig();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Track execution state
let isRunning = false;
let lastResult = null;

/**
 * Initialize command framework
 */
function initializeFramework() {
  return new GenericCommand({
    browserManager: new BrowserManager(),
    authManager: new AuthManager(),
    navigationRouter: new NavigationRouter(),
    paginationEngine: new PaginationEngine(),
    tableExtractor: new TableExtractor(),
    detailExtractor: new DetailExtractor(),
    searchEngine: new SearchEngine(),
    analyticsEngine: AnalyticsEngine,
    excelReportGenerator: new ExcelReportGenerator(),
    wordReportGenerator: new WordReportGenerator(),
    snapshotManager: new SnapshotManager(),
    snapshotComparison: SnapshotComparison
  });
}

/**
 * Get available snapshots
 */
function getSnapshots() {
  try {
    return SnapshotComparison.listSnapshots(config.snapshotDir);
  } catch {
    return [];
  }
}

/**
 * Get available exports
 */
function getExports() {
  try {
    if (!fs.existsSync(config.outputDir)) {
      return [];
    }
    return fs.readdirSync(config.outputDir)
      .map(file => ({
        name: file,
        size: fs.statSync(path.join(config.outputDir, file)).size,
        path: `/download/export/${file}`
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/status - Get current execution status
 */
app.get('/api/status', (req, res) => {
  res.json({
    running: isRunning,
    lastResult,
    config: {
      baseUrl: config.baseUrl,
      headless: config.headless
    }
  });
});

/**
 * GET /api/snapshots - Get available snapshots
 */
app.get('/api/snapshots', (req, res) => {
  try {
    const snapshots = getSnapshots();
    res.json({ snapshots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exports - Get available exports
 */
app.get('/api/exports', (req, res) => {
  try {
    const exports = getExports();
    res.json({ exports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/export - Execute export command
 */
app.post('/api/export', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Export already running' });
  }

  const { route = 'dashboard', formats = ['excel', 'snapshot'] } = req.body;

  isRunning = true;
  lastResult = { status: 'running', startTime: new Date().toISOString() };

  try {
    const command = initializeFramework();
    const result = await command.execute({
      action: 'read:full-export',
      route,
      title: `${route} Export`,
      summary: `Live export from ${route}`,
      formats,
      paginate: true
    });

    lastResult = {
      status: 'success',
      result,
      startTime: new Date().toISOString(),
      exports: getExports()
    };

    logger.info('server.export.success', { route, formats });
    res.json(lastResult);
  } catch (error) {
    logger.error('server.export.error', { message: error.message });
    lastResult = {
      status: 'error',
      error: error.message,
      startTime: new Date().toISOString()
    };
    res.status(500).json(lastResult);
  } finally {
    isRunning = false;
  }
});

/**
 * POST /api/search - Execute search command
 */
app.post('/api/search', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Operation already running' });
  }

  const { route, query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  isRunning = true;

  try {
    const command = initializeFramework();
    const result = await command.execute({
      action: 'read:search',
      route,
      query
    });

    logger.info('server.search.success', { query });
    res.json({ status: 'success', result });
  } catch (error) {
    logger.error('server.search.error', { message: error.message });
    res.status(500).json({ status: 'error', error: error.message });
  } finally {
    isRunning = false;
  }
});

/**
 * POST /api/analyze - Execute analysis command
 */
app.post('/api/analyze', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Operation already running' });
  }

  const { route, operation, field } = req.body;

  if (!operation || !field) {
    return res.status(400).json({ error: 'Operation and field are required' });
  }

  isRunning = true;

  try {
    const command = initializeFramework();
    
    // First extract the data
    const extractResult = await command.execute({
      action: 'read:extract-table',
      route,
      paginate: true
    });

    // Then analyze it
    const analyzeResult = await command.execute({
      action: 'read:analyze',
      operation,
      field,
      data: extractResult.rows
    });

    logger.info('server.analyze.success', { operation, field });
    res.json({ status: 'success', result: analyzeResult });
  } catch (error) {
    logger.error('server.analyze.error', { message: error.message });
    res.status(500).json({ status: 'error', error: error.message });
  } finally {
    isRunning = false;
  }
});

/**
 * POST /api/compare-snapshots - Compare two snapshots
 */
app.post('/api/compare-snapshots', async (req, res) => {
  const { snapshot1, snapshot2 } = req.body;

  if (!snapshot1 || !snapshot2) {
    return res.status(400).json({ error: 'Two snapshot files are required' });
  }

  try {
    const snapshots = getSnapshots();
    const snap1 = snapshots.find(s => s.fileName === snapshot1);
    const snap2 = snapshots.find(s => s.fileName === snapshot2);

    if (!snap1 || !snap2) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const comparison = SnapshotComparison.compareFiles(snap1.filePath, snap2.filePath);
    const report = SnapshotComparison.generateReport(comparison);

    logger.info('server.compare.success');
    res.json({ status: 'success', report });
  } catch (error) {
    logger.error('server.compare.error', { message: error.message });
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * GET /api/logs - Get recent logs
 */
app.get('/api/logs', (req, res) => {
  try {
    const logPath = path.join(config.logDir, 'automation.log');
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: [] });
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const logs = content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log)
      .slice(-50); // Last 50 logs

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Download Routes
// ============================================================================

/**
 * GET /download/export/:filename - Download exported file
 */
app.get('/download/export/:filename', (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(config.outputDir, filename);

  // Security: prevent path traversal
  if (!path.resolve(filepath).startsWith(path.resolve(config.outputDir))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filepath);
});

/**
 * GET /download/snapshot/:filename - Download snapshot
 */
app.get('/download/snapshot/:filename', (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(config.snapshotDir, filename);

  // Security: prevent path traversal
  if (!path.resolve(filepath).startsWith(path.resolve(config.snapshotDir))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filepath);
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 PayedPOS Automation Server running on http://localhost:${PORT}\n`);
  console.log('📊 Dashboard: http://localhost:' + PORT);
  console.log('🏥 Health: http://localhost:' + PORT + '/health');
  console.log('📚 API Docs: Check README.md for API endpoints\n');
  logger.info('server.start', { port: PORT, baseUrl: config.baseUrl });
});

module.exports = app;
