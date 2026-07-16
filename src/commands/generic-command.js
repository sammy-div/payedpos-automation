const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');
const SafetyLayer = require('../security/safety-layer');

/**
 * GenericCommand - Base class for all generic, reusable commands
 * 
 * This framework allows defining new commands without modifying core code.
 * All commands are automatically validated for read-only compliance.
 */
class GenericCommand {
  constructor(dependencies = {}) {
    this.browserManager = dependencies.browserManager;
    this.authManager = dependencies.authManager;
    this.navigationRouter = dependencies.navigationRouter;
    this.paginationEngine = dependencies.paginationEngine;
    this.tableExtractor = dependencies.tableExtractor;
    this.detailExtractor = dependencies.detailExtractor;
    this.searchEngine = dependencies.searchEngine;
    this.analyticsEngine = dependencies.analyticsEngine;
    this.excelReportGenerator = dependencies.excelReportGenerator;
    this.wordReportGenerator = dependencies.wordReportGenerator;
    this.snapshotManager = dependencies.snapshotManager;
    this.snapshotComparison = dependencies.snapshotComparison;

    this.validateDependencies();
  }

  validateDependencies() {
    // Only require the most critical ones
    if (!this.browserManager || !this.authManager) {
      throw new AutomationError('Missing required dependencies: browserManager and authManager');
    }
  }

  /**
   * Execute a command with full error handling and resource cleanup
   */
  async execute(commandDefinition) {
    if (!commandDefinition || !commandDefinition.action) {
      throw new AutomationError('Command definition must include an action');
    }

    // Validate that action is read-only
    const validation = SafetyLayer.validateCommand(commandDefinition);
    if (!validation.isValid) {
      const errors = validation.errors.join('; ');
      logger.error('command.validation.failed', { errors, action: commandDefinition.action });
      throw new AutomationError(errors);
    }

    let browser;
    let context;
    let page;

    try {
      logger.info('command.start', { action: commandDefinition.action });

      ({ browser, context, page } = await this.browserManager.launch());
      await this.authManager.ensureAuthenticated(page);

      // Execute action handler
      const handler = this.getActionHandler(commandDefinition.action);
      const result = await handler.call(this, page, commandDefinition);

      logger.info('command.success', { action: commandDefinition.action });
      return result;
    } catch (error) {
      logger.error('command.failed', { action: commandDefinition.action, message: error.message });
      throw error;
    } finally {
      await this.browserManager.close(browser, context);
    }
  }

  /**
   * Route to appropriate action handler
   */
  getActionHandler(action) {
    const handlers = {
      'read:navigate': this.actionNavigate,
      'read:extract-table': this.actionExtractTable,
      'read:extract-detail': this.actionExtractDetail,
      'read:search': this.actionSearch,
      'read:analyze': this.actionAnalyze,
      'read:export-excel': this.actionExportExcel,
      'read:export-word': this.actionExportWord,
      'read:export-snapshot': this.actionExportSnapshot,
      'read:compare-snapshots': this.actionCompareSnapshots,
      'read:full-export': this.actionFullExport
    };

    const handler = handlers[action.toLowerCase()];
    if (!handler) {
      throw new AutomationError(`Unknown action: ${action}`);
    }

    return handler;
  }

  /**
   * Navigate to a page
   */
  async actionNavigate(page, commandDef) {
    const { route, url, waitForSelector } = commandDef;

    if (!route && !url) {
      throw new AutomationError('Navigation requires route or url');
    }

    let targetUrl;
    if (route && this.navigationRouter) {
      targetUrl = await this.navigationRouter.navigate(page, route);
    } else if (url) {
      logger.info('action.navigate.url', { url });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      targetUrl = url;
    }

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 30000 }).catch(() => {
        logger.warn('action.navigate.selector.timeout', { selector: waitForSelector });
      });
    }

    return { navigatedTo: targetUrl, timestamp: new Date().toISOString() };
  }

  /**
   * Extract table data
   */
  async actionExtractTable(page, commandDef) {
    const {
      route,
      selector = 'table',
      paginate = true,
      maxPages = null
    } = commandDef;

    if (route && this.navigationRouter) {
      await this.navigationRouter.navigate(page, route);
    }

    let rows = [];

    if (paginate && this.paginationEngine) {
      let pageCount = 0;
      rows = await this.paginationEngine.paginate(
        page,
        async () => {
          pageCount++;
          if (maxPages && pageCount > maxPages) {
            return { rows: [] };
          }
          const tableData = await this.tableExtractor.extract(page, selector);
          return { headers: tableData.headers, rows: tableData.rows };
        }
      );
    } else {
      const tableData = await this.tableExtractor.extract(page, selector);
      rows = tableData.rows;
    }

    if (this.snapshotManager) {
      const snapshot = await this.snapshotManager.save({
        action: 'extract-table',
        route,
        selector,
        rows,
        generatedAt: new Date().toISOString()
      });
      return { rowCount: rows.length, snapshotPath: snapshot, rows: rows.slice(0, 10) };
    }

    return { rowCount: rows.length, rows };
  }

  /**
   * Extract detail page data
   */
  async actionExtractDetail(page, commandDef) {
    const { route, selector = 'body' } = commandDef;

    if (route && this.navigationRouter) {
      await this.navigationRouter.navigate(page, route);
    }

    if (!this.detailExtractor) {
      throw new AutomationError('DetailExtractor not available');
    }

    const detail = await this.detailExtractor.extract(page, { selector });

    return {
      fieldCount: Object.keys(detail.fields).length,
      detail
    };
  }

  /**
   * Search and extract results
   */
  async actionSearch(page, commandDef) {
    const {
      route,
      query,
      fieldIndex = 0,
      fieldLabel = null
    } = commandDef;

    if (!query) {
      throw new AutomationError('Search requires a query');
    }

    if (route && this.navigationRouter) {
      await this.navigationRouter.navigate(page, route);
    }

    if (!this.searchEngine) {
      throw new AutomationError('SearchEngine not available');
    }

    const results = await this.searchEngine.search(page, query, {
      fieldIndex,
      fieldLabel
    });

    return {
      query,
      resultCount: results.length,
      results: results.slice(0, 20)
    };
  }

  /**
   * Analyze data
   */
  async actionAnalyze(page, commandDef) {
    const {
      route,
      data,
      operation,
      field,
      groupField = null,
      topN = 10
    } = commandDef;

    if (!this.analyticsEngine) {
      throw new AutomationError('AnalyticsEngine not available');
    }

    let dataToAnalyze = data;

    // Extract data if route is provided instead
    if (!data && route && this.navigationRouter && this.tableExtractor) {
      await this.navigationRouter.navigate(page, route);
      const tableData = await this.tableExtractor.extract(page);
      dataToAnalyze = tableData.rows;
    }

    if (!Array.isArray(dataToAnalyze)) {
      throw new AutomationError('Analysis requires data array');
    }

    const operations = {
      'count': () => this.analyticsEngine.count(dataToAnalyze),
      'countBy': () => this.analyticsEngine.countBy(dataToAnalyze, field),
      'groupBy': () => this.analyticsEngine.groupBy(dataToAnalyze, groupField || field),
      'sort': () => this.analyticsEngine.sort(dataToAnalyze, field, 'asc'),
      'topN': () => this.analyticsEngine.topN(dataToAnalyze, field, topN),
      'detectDuplicates': () => this.analyticsEngine.detectDuplicates(dataToAnalyze),
      'detectMissingValues': () => this.analyticsEngine.detectMissingValues(dataToAnalyze),
      'summarize': () => this.analyticsEngine.summarize(dataToAnalyze, groupField),
      'numericStats': () => this.analyticsEngine.numericStats(dataToAnalyze, field)
    };

    if (!operations[operation]) {
      throw new AutomationError(`Unknown analysis operation: ${operation}`);
    }

    const result = operations[operation]();
    return result;
  }

  /**
   * Export to Excel
   */
  async actionExportExcel(page, commandDef) {
    const {
      route,
      data,
      title = 'PayedPOS Export',
      summary = 'Extracted data from PayedPOS'
    } = commandDef;

    if (!this.excelReportGenerator) {
      throw new AutomationError('ExcelReportGenerator not available');
    }

    let dataToExport = data;

    if (!data && route && this.navigationRouter && this.tableExtractor) {
      await this.navigationRouter.navigate(page, route);
      const tableData = await this.tableExtractor.extract(page);
      dataToExport = tableData.rows;
    }

    if (!Array.isArray(dataToExport)) {
      throw new AutomationError('Excel export requires data array');
    }

    const excelPath = await this.excelReportGenerator.generate({
      title,
      summary,
      rows: dataToExport
    });

    return {
      format: 'xlsx',
      path: excelPath,
      recordCount: dataToExport.length
    };
  }

  /**
   * Export to Word
   */
  async actionExportWord(page, commandDef) {
    const {
      route,
      data,
      title = 'PayedPOS Export',
      summary = 'Extracted data from PayedPOS',
      observations = []
    } = commandDef;

    if (!this.wordReportGenerator) {
      throw new AutomationError('WordReportGenerator not available');
    }

    let dataToExport = data;

    if (!data && route && this.navigationRouter && this.tableExtractor) {
      await this.navigationRouter.navigate(page, route);
      const tableData = await this.tableExtractor.extract(page);
      dataToExport = tableData.rows;
    }

    if (!Array.isArray(dataToExport)) {
      throw new AutomationError('Word export requires data array');
    }

    const wordPath = await this.wordReportGenerator.generate({
      title,
      summary,
      rows: dataToExport,
      observations
    });

    return {
      format: 'docx',
      path: wordPath,
      recordCount: dataToExport.length
    };
  }

  /**
   * Export snapshot
   */
  async actionExportSnapshot(page, commandDef) {
    const {
      route,
      data,
      title = 'Snapshot Export',
      summary = 'Data snapshot from PayedPOS'
    } = commandDef;

    if (!this.snapshotManager) {
      throw new AutomationError('SnapshotManager not available');
    }

    let dataToSnapshot = data;

    if (!data && route && this.navigationRouter && this.tableExtractor) {
      await this.navigationRouter.navigate(page, route);
      const tableData = await this.tableExtractor.extract(page);
      dataToSnapshot = tableData.rows;
    }

    if (!Array.isArray(dataToSnapshot)) {
      throw new AutomationError('Snapshot export requires data array');
    }

    const snapshotPath = this.snapshotManager.save({
      action: 'snapshot-export',
      title,
      summary,
      rows: dataToSnapshot,
      generatedAt: new Date().toISOString()
    });

    return {
      format: 'json',
      path: snapshotPath,
      recordCount: dataToSnapshot.length
    };
  }

  /**
   * Compare two snapshots
   */
  async actionCompareSnapshots(page, commandDef) {
    const { snapshotPath1, snapshotPath2, keyField } = commandDef;

    if (!this.snapshotComparison) {
      throw new AutomationError('SnapshotComparison not available');
    }

    if (!snapshotPath1 || !snapshotPath2) {
      throw new AutomationError('Snapshot comparison requires two snapshot paths');
    }

    const comparison = this.snapshotComparison.compareFiles(snapshotPath1, snapshotPath2, { keyField });

    return {
      comparison,
      report: this.snapshotComparison.generateReport(comparison)
    };
  }

  /**
   * Full export: navigate, extract, snapshot, and generate reports
   */
  async actionFullExport(page, commandDef) {
    const {
      route = 'dashboard',
      title = 'Full Export',
      summary = 'Complete export from PayedPOS',
      formats = ['excel', 'word', 'snapshot'],
      paginate = true
    } = commandDef;

    const results = {};

    try {
      // Navigate
      if (route && this.navigationRouter) {
        await this.navigationRouter.navigate(page, route);
      }

      // Extract
      let rows = [];
      if (paginate && this.paginationEngine) {
        rows = await this.paginationEngine.paginate(
          page,
          async () => {
            const tableData = await this.tableExtractor.extract(page);
            return { headers: tableData.headers, rows: tableData.rows };
          }
        );
      } else {
        const tableData = await this.tableExtractor.extract(page);
        rows = tableData.rows;
      }

      results.extracted = {
        rowCount: rows.length,
        timestamp: new Date().toISOString()
      };

      // Export in requested formats
      if (formats.includes('excel') && this.excelReportGenerator) {
        results.excel = {
          path: await this.excelReportGenerator.generate({ title, summary, rows }),
          format: 'xlsx'
        };
      }

      if (formats.includes('word') && this.wordReportGenerator) {
        results.word = {
          path: await this.wordReportGenerator.generate({ title, summary, rows }),
          format: 'docx'
        };
      }

      if (formats.includes('snapshot') && this.snapshotManager) {
        results.snapshot = {
          path: this.snapshotManager.save({
            route,
            title,
            summary,
            rows,
            generatedAt: new Date().toISOString()
          }),
          format: 'json'
        };
      }

      results.status = 'success';
      return results;
    } catch (error) {
      logger.error('action.fullExport.error', { message: error.message });
      throw error;
    }
  }
}

module.exports = GenericCommand;
