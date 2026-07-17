const BaseCommand = require('./base-command');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');

class ExportTerminalsCommand extends BaseCommand {
  async execute({ title = 'POS Terminals Export', summary = 'Live export of all POS terminals' } = {}) {
    let browser;
    let context;
    let page;

    try {
      ({ browser, context, page } = await this.browserManager.launch());
      await this.authManager.ensureAuthenticated(page);
      await this.navigationRouter.navigate(page, 'pos-terminals-assigned');

      const rows = await this.paginationEngine.paginate(page, async () => {
        const tableData = await this.tableExtractor.extract(page);
        return { headers: tableData.headers, rows: tableData.rows };
      });

      const snapshotPath = this.snapshotManager.save({ route: 'pos-terminals-assigned', title, summary, rows, generatedAt: new Date().toISOString() });
      const excelPath = await this.excelReportGenerator.generate({ title, summary, rows });
      const wordPath = await this.wordReportGenerator.generate({ title, summary, rows, observations: [`Total terminals exported: ${rows.length}`] });

      logger.info('command.export-terminals.complete', { excelPath, wordPath, snapshotPath });
      return { route: 'pos-terminals-assigned', excelPath, wordPath, snapshotPath, rows };
    } catch (error) {
      logger.error('command.export-terminals.failed', { message: error.message });
      throw new AutomationError('Export terminals command failed', { cause: error.message });
    } finally {
      await this.browserManager.close(browser, context);
    }
  }
}

module.exports = ExportTerminalsCommand;
