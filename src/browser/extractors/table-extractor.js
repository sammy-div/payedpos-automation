const logger = require('../../utils/logger');

class TableExtractor {
  /**
   * Extract headers and rows from a table on the page.
   *
   * Generic by design: doesn't assume a single table, doesn't assume a
   * <thead>, and doesn't assume rows live inside a <tbody>. Real-world
   * dashboards vary on all three.
   *
   * @param {import('playwright').Page} page
   * @param {string} selector - CSS selector matching one or more tables (default: 'table')
   * @param {object} options
   * @param {number} [options.tableIndex] - If multiple tables match, use this
   *   0-based index explicitly instead of the row-count heuristic below.
   * @returns {Promise<{headers: string[], rows: object[], tableCount: number, selectedTableIndex: number}>}
   */
  async extract(page, selector = 'table', options = {}) {
    logger.info('extractor.start', { selector });

    const tableCount = await page.locator(selector).count();
    if (!tableCount) {
      logger.warn('extractor.empty', { selector, message: 'No table found for the provided selector.' });
      return { headers: [], rows: [], tableCount: 0, selectedTableIndex: -1 };
    }

    const selectedTableIndex = await this.selectTableIndex(page, selector, tableCount, options.tableIndex);
    const table = page.locator(selector).nth(selectedTableIndex);

    const { headerCells, dataRows } = await table.evaluate((tableEl) => {
      const rowInfo = Array.from(tableEl.querySelectorAll('tr')).map((tr) => ({
        inThead: !!tr.closest('thead'),
        cells: Array.from(tr.children).map((cell) => (cell.textContent || '').trim())
      }));

      const theadRows = rowInfo.filter((row) => row.inThead);

      if (theadRows.length) {
        // Explicit <thead>: use it for headers, everything else is data -
        // regardless of whether the rest sit inside <tbody> or are direct
        // children of <table> (both occur in the wild).
        return {
          headerCells: theadRows[theadRows.length - 1].cells,
          dataRows: rowInfo.filter((row) => !row.inThead).map((row) => row.cells)
        };
      }

      // No <thead> at all: fall back to treating the first row as the
      // header and everything after it as data, so that row isn't
      // double-counted as both a header and a data row.
      const [first, ...rest] = rowInfo;
      return {
        headerCells: first ? first.cells : [],
        dataRows: rest.map((row) => row.cells)
      };
    });

    const headers = headerCells.map((text, index) => text || `column_${index + 1}`);

    const structuredRows = dataRows
      // Skip fully empty rows (e.g. spacer rows some dashboards render).
      .filter((cells) => cells.some((cell) => cell !== ''))
      .map((cells) => {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header] = cells[index] ?? '';
        });
        return rowObject;
      });

    logger.info('extractor.complete', {
      tableCount,
      selectedTableIndex,
      headers: headers.length,
      rows: structuredRows.length
    });

    return { headers, rows: structuredRows, tableCount, selectedTableIndex };
  }

  /**
   * When a selector matches multiple tables, pick the most likely "real"
   * data table: the one with the most rows. This is a heuristic, not a
   * guess about any specific site's markup - it just avoids silently
   * grabbing whichever table happens to be first in the DOM (which is
   * often a filters/legend table, not the actual data).
   * @private
   */
  async selectTableIndex(page, selector, tableCount, explicitIndex) {
    if (typeof explicitIndex === 'number') {
      if (explicitIndex < 0 || explicitIndex >= tableCount) {
        throw new Error(`tableIndex ${explicitIndex} is out of range (0-${tableCount - 1})`);
      }
      return explicitIndex;
    }

    if (tableCount === 1) {
      return 0;
    }

    const rowCounts = await Promise.all(
      Array.from({ length: tableCount }, (_, index) => page.locator(selector).nth(index).locator('tr').count())
    );

    let bestIndex = 0;
    for (let i = 1; i < rowCounts.length; i += 1) {
      if (rowCounts[i] > rowCounts[bestIndex]) {
        bestIndex = i;
      }
    }

    logger.info('extractor.multi-table', { tableCount, rowCounts, selectedTableIndex: bestIndex });
    return bestIndex;
  }
}

module.exports = TableExtractor;
