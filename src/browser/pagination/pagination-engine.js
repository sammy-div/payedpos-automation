const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

class PaginationEngine {
  async paginate(page, extractPageData, options = {}) {
    const { waitForLoad = true } = options;
    const collectedRows = [];
    let pageNumber = 1;
    let previousSignature = '';

    while (true) {
      logger.info('pagination.page', { pageNumber });
      const pageData = await extractPageData();
      const signature = JSON.stringify(pageData.rows);

      if (signature && signature === previousSignature) {
        logger.warn('pagination.duplicate', { pageNumber });
        break;
      }

      previousSignature = signature;
      collectedRows.push(...pageData.rows);

      if (waitForLoad) {
        await page.waitForTimeout(500);
      }

      const nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
      if (await nextButton.count()) {
        await nextButton.click().catch(() => {
          throw new AutomationError('Failed to click next pagination button');
        });
        pageNumber += 1;
        continue;
      }

      const activePageNumber = await this.getActivePageNumber(page);
      if (activePageNumber !== null) {
        const nextPageNumber = activePageNumber + 1;
        const numberedLink = page.locator('a, button').filter({ hasText: String(nextPageNumber) }).first();
        if (await numberedLink.count()) {
          await numberedLink.click().catch(() => {
            throw new AutomationError('Failed to click numbered pagination link');
          });
          pageNumber += 1;
          continue;
        }
      }

      break;
    }

    logger.info('pagination.complete', { totalRows: collectedRows.length });
    return collectedRows;
  }

  async getActivePageNumber(page) {
    const activeSelectors = [
      'a[aria-current="page"]',
      'button[aria-current="page"]',
      '.active',
      '.page-item.active'
    ];

    for (const selector of activeSelectors) {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        const text = (await locator.textContent()) || '';
        const parsed = Number(text.trim());
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }
}

module.exports = PaginationEngine;
