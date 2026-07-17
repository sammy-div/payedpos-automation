const BaseCommand = require('./base-command');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

class ExportDashboardCommand extends BaseCommand {
  async execute({ route = 'dashboard', title = 'PayedPOS Dashboard Export', summary = 'Live export from current dashboard state' } = {}) {
    let browser;
    let context;
    let page;

    try {
      ({ browser, context, page } = await this.browserManager.launch());
      await this.authManager.ensureAuthenticated(page);
      await this.navigationRouter.navigate(page, route);

      const rows = await this.paginationEngine.paginate(
        page,
        async () => {
          const tableData = await this.tableExtractor.extract(page);
          return { headers: tableData.headers, rows: tableData.rows };
        }
      );

      const snapshotPath = this.snapshotManager.save({ route, title, summary, rows, generatedAt: new Date().toISOString() });
      const excelPath = await this.excelReportGenerator.generate({ title, summary, rows });
      const wordPath = await this.wordReportGenerator.generate({ title, summary, rows, observations: [`Snapshot saved to ${snapshotPath}`] });

      logger.info('command.complete', { route, excelPath, wordPath, snapshotPath });
      return { route, excelPath, wordPath, snapshotPath, rows };
    } catch (error) {
      logger.error('command.failed', { message: error.message, route });
      throw new AutomationError(`Command failed for route ${route}`, { cause: error.message });
    } finally {
      await this.browserManager.close(browser, context);
    }
  }
}

module.exports = ExportDashboardCommand;
