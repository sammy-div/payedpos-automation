const ExcelJS = require('exceljs');
const { getConfig } = require('../../config/env');
const { getOutputPath, getTimestampedFileName } = require('../../utils/file');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

class ExcelReportGenerator {
  async generate({ title, summary, rows, observations = [] }) {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report');

      sheet.addRow([title]);
      sheet.addRow([]);
      sheet.addRow(['Generated At', new Date().toISOString()]);
      sheet.addRow(['Summary', summary]);
      sheet.addRow(['Total Records', rows.length]);
      sheet.addRow([]);

      if (rows.length) {
        sheet.addRow(Object.keys(rows[0]));
        rows.forEach((row) => {
          sheet.addRow(Object.keys(row).map((key) => row[key] ?? ''));
        });
      } else {
        sheet.addRow(['No data available']);
      }

      if (observations.length) {
        sheet.addRow([]);
        sheet.addRow(['Observations']);
        observations.forEach((observation) => sheet.addRow([observation]));
      }

      const outputPath = getOutputPath(getTimestampedFileName('report', 'xlsx'), getConfig().outputDir);
      await workbook.xlsx.writeFile(outputPath);
      logger.info('report.excel', { outputPath, totalRows: rows.length });
      return outputPath;
    } catch (error) {
      logger.error('report.excel.error', { message: error.message });
      throw new AutomationError('Excel export failed', { cause: error.message });
    }
  }
}

module.exports = ExcelReportGenerator;
