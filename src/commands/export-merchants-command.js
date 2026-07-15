const BaseCommand = require('./base-command');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

class ExportMerchantsCommand extends BaseCommand {
  async execute({ title = 'Merchants Export', summary = 'Live export of all merchants' } = {}) {
    let browser;
    let context;
    let page;

    try {
      ({ browser, context, page } = await this.browserManager.launch());
      await this.authManager.ensureAuthenticated(page);
      await this.navigationRouter.navigate(page, 'merchants');

      const rows = await this.paginationEngine.paginate(page, async () => {
        const tableData = await this.tableExtractor.extract(page);
        return { headers: tableData.headers, rows: tableData.rows };
      });

      const snapshotPath = this.snapshotManager.save({ route: 'merchants', title, summary, rows, generatedAt: new Date().toISOString() });
      const excelPath = this.excelReportGenerator.generate({ title, summary, rows });
      const wordPath = await this.wordReportGenerator.generate({ title, summary, rows, observations: [`Total merchants exported: ${rows.length}`] });

      logger.info('command.export-merchants.complete', { excelPath, wordPath, snapshotPath });
      return { route: 'merchants', excelPath, wordPath, snapshotPath, rows };
    } catch (error) {
      logger.error('command.export-merchants.failed', { message: error.message });
      throw new AutomationError('Export merchants command failed', { cause: error.message });
    } finally {
      await this.browserManager.close(browser, context);
    }
  }
}

module.exports = ExportMerchantsCommand;
