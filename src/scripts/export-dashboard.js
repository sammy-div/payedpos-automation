const BrowserManager = require('../browser/browser-manager');
const AuthManager = require('../browser/auth/auth-manager');
const { NavigationRouter } = require('../browser/navigation/router');
const PaginationEngine = require('../browser/pagination/pagination-engine');
const TableExtractor = require('../browser/extractors/table-extractor');
const ExcelReportGenerator = require('../reports/excel/report-generator');
const WordReportGenerator = require('../reports/word/report-generator');
const SnapshotManager = require('../snapshots/snapshot-manager');
const ExportDashboardCommand = require('../commands/export-dashboard-command');

async function main() {
  const browserManager = new BrowserManager();
  const authManager = new AuthManager();
  const navigationRouter = new NavigationRouter();
  const paginationEngine = new PaginationEngine();
  const tableExtractor = new TableExtractor();
  const excelReportGenerator = new ExcelReportGenerator();
  const wordReportGenerator = new WordReportGenerator();
  const snapshotManager = new SnapshotManager();

  const command = new ExportDashboardCommand({
    browserManager,
    authManager,
    navigationRouter,
    paginationEngine,
    tableExtractor,
    excelReportGenerator,
    wordReportGenerator,
    snapshotManager
  });

  await command.execute({ route: 'dashboard' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
