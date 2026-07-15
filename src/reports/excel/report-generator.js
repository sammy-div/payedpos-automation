const xlsx = require('xlsx');
const { getOutputPath, getTimestampedFileName } = require('../../utils/file');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

class ExcelReportGenerator {
  generate({ title, summary, rows, observations = [] }) {
    try {
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.aoa_to_sheet([
        [title],
        [],
        ['Generated At', new Date().toISOString()],
        ['Summary', summary],
        ['Total Records', rows.length],
        [],
        ...(rows.length ? [Object.keys(rows[0])] : [['No data available']])
      ]);

      if (rows.length) {
        rows.forEach((row) => {
          const values = Object.keys(row).map((key) => row[key] ?? '');
          xlsx.utils.sheet_add_aoa(sheet, [values], { origin: -1 });
        });
      }

      xlsx.utils.book_append_sheet(workbook, sheet, 'Report');
      const outputPath = getOutputPath(getTimestampedFileName('report', 'xlsx'));
      xlsx.writeFile(workbook, outputPath);
      logger.info('report.excel', { outputPath, totalRows: rows.length });
      return outputPath;
    } catch (error) {
      logger.error('report.excel.error', { message: error.message });
      throw new AutomationError('Excel export failed', { cause: error.message });
    }
  }
}

module.exports = ExcelReportGenerator;
