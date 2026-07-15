class BaseCommand {
  constructor({ browserManager, authManager, navigationRouter, paginationEngine, tableExtractor, excelReportGenerator, wordReportGenerator, snapshotManager }) {
    this.browserManager = browserManager;
    this.authManager = authManager;
    this.navigationRouter = navigationRouter;
    this.paginationEngine = paginationEngine;
    this.tableExtractor = tableExtractor;
    this.excelReportGenerator = excelReportGenerator;
    this.wordReportGenerator = wordReportGenerator;
    this.snapshotManager = snapshotManager;
  }

  async execute() {
    throw new Error('execute() must be implemented by a concrete command');
  }
}

module.exports = BaseCommand;
