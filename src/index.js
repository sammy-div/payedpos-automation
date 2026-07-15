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
const logger = require('./utils/logger');
const { getConfig } = require('./config/env');

/**
 * Initialize all modules and execute a command
 */
async function main() {
  const config = getConfig();

  logger.info('app.start', { baseUrl: config.baseUrl });
  logger.info('app.safety', { message: SafetyLayer.getPolicySummary() });

  // Initialize all modules
  const browserManager = new BrowserManager();
  const authManager = new AuthManager();
  const navigationRouter = new NavigationRouter();
  const paginationEngine = new PaginationEngine();
  const tableExtractor = new TableExtractor();
  const detailExtractor = new DetailExtractor();
  const searchEngine = new SearchEngine();
  const analyticsEngine = AnalyticsEngine;
  const excelReportGenerator = new ExcelReportGenerator();
  const wordReportGenerator = new WordReportGenerator();
  const snapshotManager = new SnapshotManager();
  const snapshotComparison = SnapshotComparison;

  // Create generic command with all dependencies
  const command = new GenericCommand({
    browserManager,
    authManager,
    navigationRouter,
    paginationEngine,
    tableExtractor,
    detailExtractor,
    searchEngine,
    analyticsEngine,
    excelReportGenerator,
    wordReportGenerator,
    snapshotManager,
    snapshotComparison
  });

  // Default command: Full export from dashboard
  const commandDefinition = {
    action: 'read:full-export',
    route: 'dashboard',
    title: 'PayedPOS Dashboard Export',
    summary: 'Live export from current dashboard state',
    formats: ['excel', 'word', 'snapshot'],
    paginate: true
  };

  try {
    const result = await command.execute(commandDefinition);
    logger.info('app.complete', { status: 'success', result });
    console.log('\n✓ Export completed successfully!');
    console.log('Results:', result);
    return result;
  } catch (error) {
    logger.error('app.failed', { message: error.message, stack: error.stack });
    console.error('\n✗ Export failed:', error.message);
    process.exit(1);
  }
}

// Execute main function
if (require.main === module) {
  main().catch((error) => {
    logger.error('app.unhandled', { message: error.message });
    process.exit(1);
  });
}

module.exports = { main };
