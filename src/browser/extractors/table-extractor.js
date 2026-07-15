const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

class TableExtractor {
  async extract(page, selector = 'table') {
    logger.info('extractor.start', { selector });

    const table = page.locator(selector).first();
    const exists = await table.count();
    if (!exists) {
      logger.warn('extractor.empty', { selector, message: 'No table found for the provided selector.' });
      return { headers: [], rows: [] };
    }

    let headers = await table.locator('thead th').allTextContents();
    if (!headers.length) {
      headers = await table.locator('tr').first().locator('th, td').allTextContents();
    }

    const rows = await table.locator('tbody tr').evaluateAll((trs) => {
      return Array.from(trs).map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || ''));
    });

    const structuredRows = rows.map((rowValues) => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header || `column_${index + 1}`] = rowValues[index] || '';
      });
      return rowObject;
    });

    logger.info('extractor.complete', { headers: headers.length, rows: structuredRows.length });
    return { headers, rows: structuredRows };
  }
}

module.exports = TableExtractor;
