const BrowserManager = require('../browser/browser-manager');
const AuthManager = require('../browser/auth/auth-manager');
const { NavigationRouter } = require('../browser/navigation/router');
const PaginationEngine = require('../browser/pagination/pagination-engine');
const TableExtractor = require('../browser/extractors/table-extractor');
const ExcelReportGenerator = require('../reports/excel/report-generator');
const WordReportGenerator = require('../reports/word/report-generator');
const SnapshotManager = require('../snapshots/snapshot-manager');
const ExportMerchantsCommand = require('../commands/export-merchants-command');
const logger = require('../utils/logger');

async function main() {
  const command = new ExportMerchantsCommand({
    browserManager: new BrowserManager(),
    authManager: new AuthManager(),
    navigationRouter: new NavigationRouter(),
    paginationEngine: new PaginationEngine(),
    tableExtractor: new TableExtractor(),
    excelReportGenerator: new ExcelReportGenerator(),
    wordReportGenerator: new WordReportGenerator(),
    snapshotManager: new SnapshotManager()
  });

  logger.info('script.export-merchants.start', {});
  const result = await command.execute({ route: 'merchants' });
  logger.info('script.export-merchants.complete', result);
}

main().catch((error) => {
  logger.error('script.export-merchants.failed', { message: error.message });
  process.exit(1);
});
