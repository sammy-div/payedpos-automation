/**
 * Script Example: Execute Generic Commands
 * 
 * This shows how to programmatically use the GenericCommand framework
 * to execute various operations.
 * 
 * Usage: node src/scripts/generic-command-runner.js
 */

const GenericCommand = require('../commands/generic-command');
const BrowserManager = require('../browser/browser-manager');
const AuthManager = require('../browser/auth/auth-manager');
const { NavigationRouter } = require('../browser/navigation/router');
const PaginationEngine = require('../browser/pagination/pagination-engine');
const TableExtractor = require('../browser/extractors/table-extractor');
const DetailExtractor = require('../browser/extractors/detail-extractor');
const SearchEngine = require('../browser/search/search-engine');
const AnalyticsEngine = require('../analytics/analytics-engine');
const ExcelReportGenerator = require('../reports/excel/report-generator');
const WordReportGenerator = require('../reports/word/report-generator');
const SnapshotManager = require('../snapshots/snapshot-manager');
const SnapshotComparison = require('../snapshots/snapshot-comparison');
const logger = require('../utils/logger');

/**
 * Initialize the command framework
 */
function initializeFramework() {
  const command = new GenericCommand({
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

  return command;
}

/**
 * Example 1: Export dashboard to Excel
 */
async function exampleExportDashboard() {
  console.log('\n=== Example 1: Export Dashboard ===');

  const command = initializeFramework();
  const commandDef = {
    action: 'read:full-export',
    route: 'dashboard',
    title: 'Dashboard Export',
    summary: 'Complete dashboard export',
    formats: ['excel', 'snapshot'],
    paginate: true
  };

  try {
    const result = await command.execute(commandDef);
    console.log('Export completed:', result);
  } catch (error) {
    console.error('Export failed:', error.message);
  }
}

/**
 * Example 2: Search and extract
 */
async function exampleSearchAndExtract() {
  console.log('\n=== Example 2: Search and Extract ===');

  const command = initializeFramework();
  const commandDef = {
    action: 'read:search',
    route: 'merchants',
    query: 'cafe',
    fieldLabel: 'Merchant Name'
  };

  try {
    const result = await command.execute(commandDef);
    console.log('Search results:', result);
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

/**
 * Example 3: Analyze data with grouping
 */
async function exampleAnalyzeData() {
  console.log('\n=== Example 3: Analyze Data ===');

  const command = initializeFramework();
  
  // First extract the data
  const extractDef = {
    action: 'read:extract-table',
    route: 'pos-terminals',
    selector: 'table',
    paginate: true
  };

  try {
    const extracted = await command.execute(extractDef);
    console.log(`Extracted ${extracted.rowCount} records`);

    // Then analyze it
    const analysisDef = {
      action: 'read:analyze',
      operation: 'countBy',
      field: 'Status',
      data: extracted.rows
    };

    const analysis = await command.execute(analysisDef);
    console.log('Analysis:', analysis);
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

/**
 * Example 4: Generate word report
 */
async function exampleGenerateWordReport() {
  console.log('\n=== Example 4: Generate Word Report ===');

  const command = initializeFramework();
  const commandDef = {
    action: 'read:full-export',
    route: 'dashboard',
    title: 'PayedPOS Dashboard Report',
    summary: 'Professional report export',
    formats: ['word'],
    paginate: true,
    observations: [
      'Data exported on ' + new Date().toLocaleDateString(),
      'Includes all dashboard records at time of export',
      'Report generated for analysis purposes'
    ]
  };

  try {
    const result = await command.execute(commandDef);
    console.log('Report generated:', result);
  } catch (error) {
    console.error('Report generation failed:', error.message);
  }
}

/**
 * Example 5: Compare snapshots
 */
async function exampleCompareSnapshots() {
  console.log('\n=== Example 5: Compare Snapshots ===');

  // Get available snapshots
  const SnapshotComparison = require('../snapshots/snapshot-comparison');
  const { getConfig } = require('../config/env');

  const config = getConfig();
  const snapshots = SnapshotComparison.listSnapshots(config.snapshotDir);

  if (snapshots.length < 2) {
    console.log('Need at least 2 snapshots to compare');
    return;
  }

  const commandDef = {
    action: 'read:compare-snapshots',
    snapshotPath1: snapshots[0].filePath,
    snapshotPath2: snapshots[1].filePath
  };

  try {
    const command = initializeFramework();
    const result = await command.execute(commandDef);
    console.log('Comparison:', result.report);
  } catch (error) {
    console.error('Comparison failed:', error.message);
  }
}

/**
 * Example 6: Get performance summary
 */
async function examplePerformanceSummary() {
  console.log('\n=== Example 6: Performance Summary ===');

  const summary = logger.getPerformanceSummary();
  console.log('Performance Metrics:', summary);

  const logSummary = logger.getSummary();
  console.log('Log Summary:', logSummary);
}

/**
 * Main execution
 */
async function main() {
  const example = process.argv[2] || 'export';

  const examples = {
    export: exampleExportDashboard,
    search: exampleSearchAndExtract,
    analyze: exampleAnalyzeData,
    report: exampleGenerateWordReport,
    compare: exampleCompareSnapshots,
    performance: examplePerformanceSummary
  };

  if (!examples[example]) {
    console.log('Available examples:');
    Object.keys(examples).forEach(ex => console.log(`  - ${ex}`));
    console.log('\nUsage: node src/scripts/generic-command-runner.js [example]');
    process.exit(1);
  }

  console.log(`Executing example: ${example}`);
  await examples[example]();
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    logger.error('example.error', { message: error.message });
    process.exit(1);
  });
}

module.exports = { initializeFramework };
