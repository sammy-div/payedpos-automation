const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

/**
 * SearchEngine - Generic search functionality across dashboard pages
 * 
 * Supports:
 * - Auto-detection of search fields
 * - Search by any available field
 * - Multiple search patterns
 * - Search result extraction
 * - No hardcoded field names
 */
class SearchEngine {
  /**
   * Detect available search options on page
   * @param {object} page - Playwright page object
   * @param {object} options - Detection options
   * @returns {Promise<array>} Array of search field definitions
   */
  async detectSearchFields(page, options = {}) {
    logger.info('search.detectFields.start');

    const searchFields = [];

    try {
      // Pattern 1: Find input fields with labels
      const inputs = await page.locator('input[type="text"], input[type="search"], input:not([type])').count();

      for (let i = 0; i < inputs; i++) {
        const input = page.locator('input[type="text"], input[type="search"], input:not([type])').nth(i);
        const label = await this.findAssociatedLabel(page, input);
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');

        if (label || placeholder || name) {
          searchFields.push({
            selector: `input[type="text"], input[type="search"], input:not([type])`,
            index: i,
            label: label || placeholder || name || `Field ${i + 1}`,
            placeholder,
            name,
            type: 'text'
          });
        }
      }

      // Pattern 2: Find dropdown/select search fields
      const selects = await page.locator('select, [role="combobox"], [role="listbox"]').count();

      for (let i = 0; i < selects; i++) {
        const select = page.locator('select, [role="combobox"], [role="listbox"]').nth(i);
        const label = await this.findAssociatedLabel(page, select);
        const name = await select.getAttribute('name');

        if (label || name) {
          searchFields.push({
            selector: `select, [role="combobox"], [role="listbox"]`,
            index: i,
            label: label || name || `Option ${i + 1}`,
            name,
            type: 'select'
          });
        }
      }

      // Pattern 3: Find filter buttons/toggles
      const filterButtons = await page.locator('button[aria-label*="filter" i], button[title*="filter" i]').count();

      for (let i = 0; i < filterButtons; i++) {
        const button = page.locator('button[aria-label*="filter" i], button[title*="filter" i]').nth(i);
        const label = await button.getAttribute('aria-label') || await button.getAttribute('title') || await button.textContent();

        if (label) {
          searchFields.push({
            selector: `button[aria-label*="filter" i], button[title*="filter" i]`,
            index: i,
            label: label.trim(),
            type: 'button'
          });
        }
      }

      // Pattern 4: Find search-specific inputs
      const searchInputs = await page.locator('[data-testid*="search"], [class*="search"], input[name*="search"]').count();

      for (let i = 0; i < searchInputs; i++) {
        const input = page.locator('[data-testid*="search"], [class*="search"], input[name*="search"]').nth(i);
        const label = await input.getAttribute('placeholder') || await input.getAttribute('aria-label') || 'Search';

        searchFields.push({
          selector: `[data-testid*="search"], [class*="search"], input[name*="search"]`,
          index: i,
          label,
          type: 'text',
          isDefaultSearch: true
        });
      }

      logger.info('search.detectFields.complete', { fieldCount: searchFields.length });
      return searchFields;
    } catch (error) {
      logger.error('search.detectFields.error', { message: error.message });
      throw new AutomationError('Failed to detect search fields', { cause: error.message });
    }
  }

  /**
   * Find label associated with an input
   * @private
   */
  async findAssociatedLabel(page, element) {
    try {
      // Try to find label by for attribute
      const id = await element.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).textContent();
        if (label) return label.trim();
      }

      // Try to find label by proximity
      const parent = await element.evaluate(el => el.closest('.form-group, .field, [class*="field"], [class*="control"]'));
      if (parent) {
        const label = await page.locator('label').first().textContent();
        if (label) return label.trim();
      }

      // Try aria-label
      return await element.getAttribute('aria-label');
    } catch {
      return null;
    }
  }

  /**
   * Perform a search
   * @param {object} page - Playwright page object
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<array>} Search results
   */
  async search(page, query, options = {}) {
    const {
      fieldIndex = 0,
      fieldLabel = null,
      resultSelector = 'table, [role="table"], .results, .data-grid',
      submitButton = 'button[type="submit"], button:has-text("Search"), [aria-label*="search"]',
      waitForResults = true,
      timeout = 30000
    } = options;

    logger.info('search.execute', { query, fieldLabel });

    try {
      // Detect search fields if not already done
      const searchFields = await this.detectSearchFields(page);

      if (searchFields.length === 0) {
        logger.warn('search.noFields', { message: 'No search fields found' });
        return [];
      }

      // Find the correct field
      let targetField = searchFields[fieldIndex];

      if (fieldLabel) {
        targetField = searchFields.find(f => f.label.toLowerCase().includes(fieldLabel.toLowerCase()));
      }

      if (!targetField) {
        throw new AutomationError('Search field not found', { fieldLabel, fieldIndex });
      }

      // Enter search query
      const fieldLocator = page.locator(targetField.selector).nth(targetField.index);
      await fieldLocator.fill(query);
      logger.info('search.query.entered', { query, field: targetField.label });

      // Submit search
      const submit = page.locator(submitButton).first();
      if (await submit.count()) {
        await submit.click();
        logger.info('search.submitted');

        if (waitForResults) {
          await page.waitForSelector(resultSelector, { timeout }).catch(() => {
            logger.warn('search.results.timeout', { message: 'Results did not appear within timeout' });
          });
        }
      }

      // Wait for loading to complete
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      // Extract results
      const results = await this.extractSearchResults(page, resultSelector);
      logger.info('search.complete', { resultCount: results.length });

      return results;
    } catch (error) {
      logger.error('search.error', { message: error.message, query });
      throw new AutomationError('Search failed', { cause: error.message, query });
    }
  }

  /**
   * Extract search results from page
   * @private
   */
  async extractSearchResults(page, selector) {
    const resultElements = await page.locator(selector).first();

    if (!await resultElements.count()) {
      return [];
    }

    // Try to extract table data
    const tableRows = await resultElements.locator('tr').count();
    if (tableRows > 0) {
      const headers = await resultElements.locator('thead th, th').allTextContents();
      const rows = await resultElements.locator('tbody tr, tr').evaluateAll(trs => {
        return Array.from(trs).map(row =>
          Array.from(row.querySelectorAll('td')).map(cell =>
            cell.textContent?.trim() || ''
          )
        );
      });

      return rows.map(rowValues => {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header?.trim() || `column_${index + 1}`] = rowValues[index] || '';
        });
        return rowObject;
      });
    }

    // Try to extract list items
    const listItems = await resultElements.locator('li, [role="option"], .result-item').count();
    if (listItems > 0) {
      return await resultElements.locator('li, [role="option"], .result-item').allTextContents();
    }

    // Try to extract cards/divs
    const cards = await resultElements.locator('[class*="card"], [class*="result"], > div').count();
    if (cards > 0) {
      return await resultElements.locator('[class*="card"], [class*="result"], > div').allTextContents();
    }

    return [];
  }

  /**
   * Clear search field
   */
  async clearSearch(page, options = {}) {
    const { fieldIndex = 0, fieldLabel = null } = options;

    logger.info('search.clear');

    try {
      const searchFields = await this.detectSearchFields(page);
      let targetField = searchFields[fieldIndex];

      if (fieldLabel) {
        targetField = searchFields.find(f => f.label.toLowerCase().includes(fieldLabel.toLowerCase()));
      }

      if (!targetField) {
        throw new AutomationError('Search field not found');
      }

      const fieldLocator = page.locator(targetField.selector).nth(targetField.index);
      await fieldLocator.clear();
      logger.info('search.cleared');
    } catch (error) {
      logger.error('search.clear.error', { message: error.message });
      throw error;
    }
  }

  /**
   * Get all available search fields with their values
   */
  async getSearchFieldsWithValues(page) {
    logger.info('search.getFields');

    const fields = await this.detectSearchFields(page);

    for (const field of fields) {
      const locator = page.locator(field.selector).nth(field.index);

      if (field.type === 'text') {
        field.currentValue = await locator.inputValue().catch(() => '');
      } else if (field.type === 'select') {
        field.currentValue = await locator.getAttribute('value');
        field.options = await locator.locator('option').allTextContents().catch(() => []);
      }
    }

    return fields;
  }
}

module.exports = SearchEngine;
