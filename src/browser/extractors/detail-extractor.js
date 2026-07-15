const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

/**
 * DetailExtractor - Extracts structured data from detail/modal pages
 * 
 * Supports:
 * - Key-value pair extraction
 * - Nested data structures
 * - List/table extraction within detail pages
 * - Flexible selector patterns
 */
class DetailExtractor {
  /**
   * Extract detail data from a page
   * @param {object} page - Playwright page object
   * @param {object} options - Extraction options
   * @returns {Promise<object>} Extracted detail data
   */
  async extract(page, options = {}) {
    const {
      selector = 'body',
      keyValueSelectors = [],
      tableSelectors = [],
      listSelectors = [],
      nestedPaths = []
    } = options;

    logger.info('detail-extractor.start', { selector });

    try {
      const container = page.locator(selector).first();
      const exists = await container.count();

      if (!exists) {
        logger.warn('detail-extractor.empty', { selector });
        return { fields: {}, tables: {}, lists: {}, nested: {} };
      }

      const result = {
        fields: {},
        tables: {},
        lists: {},
        nested: {},
        extracted_at: new Date().toISOString()
      };

      // Extract key-value pairs
      if (keyValueSelectors.length > 0) {
        result.fields = await this.extractKeyValuePairs(container, keyValueSelectors);
      } else {
        // Auto-detect key-value pairs
        result.fields = await this.autoDetectKeyValuePairs(container);
      }

      // Extract tables
      if (tableSelectors.length > 0) {
        result.tables = await this.extractTables(container, tableSelectors);
      }

      // Extract lists
      if (listSelectors.length > 0) {
        result.lists = await this.extractLists(container, listSelectors);
      }

      // Extract nested data
      if (nestedPaths.length > 0) {
        result.nested = await this.extractNested(container, nestedPaths);
      }

      logger.info('detail-extractor.complete', {
        fieldCount: Object.keys(result.fields).length,
        tableCount: Object.keys(result.tables).length,
        listCount: Object.keys(result.lists).length
      });

      return result;
    } catch (error) {
      logger.error('detail-extractor.error', { message: error.message });
      throw new AutomationError('Detail extraction failed', { cause: error.message });
    }
  }

  /**
   * Extract key-value pairs from labels and values
   * @private
   */
  async extractKeyValuePairs(container, selectors) {
    const pairs = {};

    for (const selectorConfig of selectors) {
      const { label: labelSelector, value: valueSelector, name } = selectorConfig;

      if (!labelSelector || !valueSelector) continue;

      const labelLocator = container.locator(labelSelector);
      const labelCount = await labelLocator.count();

      for (let i = 0; i < labelCount; i++) {
        const label = await labelLocator.nth(i).textContent();
        const key = label?.trim() || name || `field_${i}`;

        // Try to find associated value
        const valueElement = container.locator(valueSelector).nth(i);
        const value = await valueElement.textContent();

        if (key && value) {
          pairs[key] = value.trim();
        }
      }
    }

    return pairs;
  }

  /**
   * Auto-detect key-value pairs by looking for common patterns
   * @private
   */
  async autoDetectKeyValuePairs(container) {
    const pairs = {};

    // Pattern 1: label + span/p pairs
    const labels = await container.locator('label, .label, [class*="label"]').allTextContents();

    for (const label of labels) {
      const trimmedLabel = label.trim();
      if (!trimmedLabel) continue;

      // Look for adjacent text content
      const elements = await container.locator(`text="${trimmedLabel}" ~ *`).allTextContents();
      if (elements.length > 0) {
        pairs[trimmedLabel] = elements[0].trim();
      }
    }

    // Pattern 2: dt/dd pairs (definition lists)
    const dts = await container.locator('dt').allTextContents();
    for (let i = 0; i < dts.length; i++) {
      const dt = dts[i].trim();
      const dd = await container.locator('dd').nth(i).textContent();
      if (dt && dd) {
        pairs[dt] = dd.trim();
      }
    }

    // Pattern 3: div rows with two columns
    const rows = await container.locator('.row, [class*="row"]').count();
    for (let i = 0; i < rows; i++) {
      const row = container.locator('.row, [class*="row"]').nth(i);
      const cols = await row.locator('[class*="col"]').allTextContents();
      if (cols.length >= 2) {
        pairs[cols[0].trim()] = cols[1].trim();
      }
    }

    return pairs;
  }

  /**
   * Extract tables from detail page
   * @private
   */
  async extractTables(container, selectors) {
    const tables = {};

    for (const selectorConfig of selectors) {
      const { selector, name } = selectorConfig;
      const tableLocator = container.locator(selector).first();
      const tableExists = await tableLocator.count();

      if (!tableExists) continue;

      const headers = await tableLocator.locator('thead th, th').allTextContents();
      const rows = await tableLocator.locator('tbody tr, tr').evaluateAll(trs => {
        return Array.from(trs).map(row =>
          Array.from(row.querySelectorAll('td')).map(cell =>
            cell.textContent?.trim() || ''
          )
        );
      });

      const structuredRows = rows.map(rowValues => {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header?.trim() || `column_${index + 1}`] = rowValues[index] || '';
        });
        return rowObject;
      });

      tables[name || selector] = {
        headers,
        rows: structuredRows
      };
    }

    return tables;
  }

  /**
   * Extract lists from detail page
   * @private
   */
  async extractLists(container, selectors) {
    const lists = {};

    for (const selectorConfig of selectors) {
      const { selector, name, itemSelector = 'li' } = selectorConfig;
      const listLocator = container.locator(selector).first();
      const listExists = await listLocator.count();

      if (!listExists) continue;

      const items = await listLocator.locator(itemSelector).allTextContents();
      lists[name || selector] = items.map(item => item.trim()).filter(item => item);
    }

    return lists;
  }

  /**
   * Extract nested data from various levels
   * @private
   */
  async extractNested(container, paths) {
    const nested = {};

    for (const path of paths) {
      const { key, selector, extractor } = path;

      const element = container.locator(selector).first();
      const exists = await element.count();

      if (!exists) continue;

      if (typeof extractor === 'function') {
        nested[key] = await extractor(element);
      } else if (extractor === 'text') {
        nested[key] = await element.textContent();
      } else if (extractor === 'html') {
        nested[key] = await element.innerHTML();
      } else if (extractor === 'attribute') {
        nested[key] = await element.getAttribute(path.attributeName || 'data-value');
      }
    }

    return nested;
  }

  /**
   * Extract all visible text from a section
   */
  async extractText(page, selector = 'body') {
    logger.info('detail-extractor.text.start', { selector });

    const container = page.locator(selector).first();
    const exists = await container.count();

    if (!exists) {
      return { text: '' };
    }

    const text = await container.textContent();
    const cleaned = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    logger.info('detail-extractor.text.complete', { lines: cleaned.split('\n').length });

    return { text: cleaned };
  }

  /**
   * Extract metadata from page (title, meta tags, etc.)
   */
  async extractMetadata(page) {
    logger.info('detail-extractor.metadata.start');

    const title = await page.title();
    const url = page.url();
    const heading = await page.locator('h1, h2').first().textContent();

    const metadata = {
      title,
      url,
      heading: heading?.trim() || '',
      extracted_at: new Date().toISOString()
    };

    logger.info('detail-extractor.metadata.complete', { title, url });

    return metadata;
  }
}

module.exports = DetailExtractor;
