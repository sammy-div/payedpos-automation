const fs = require('fs');
const { chromium } = require('playwright');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');
const { AutomationError } = require('../utils/errors');
const { withRetry } = require('../utils/retry');

class BrowserManager {
  constructor() {
    this.config = getConfig();
  }

  async launch() {
    const browser = await withRetry(async () => {
      logger.info('browser.launch', { headless: this.config.headless });
      return chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
    }, { retries: this.config.maxRetries });

    const contextOptions = {
      viewport: this.config.viewport,
      ignoreHTTPSErrors: true
    };

    if (this.config.storageStatePath && fs.existsSync(this.config.storageStatePath)) {
      contextOptions.storageState = this.config.storageStatePath;
      logger.info('browser.storageState.loaded', { path: this.config.storageStatePath });
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    return { browser, context, page };
  }

  async close(browser, context) {
    try {
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
      logger.info('browser.close', { status: 'ok' });
    } catch (error) {
      logger.error('browser.close', { message: error.message });
      throw new AutomationError('Failed to shut down browser gracefully', { cause: error.message });
    }
  }
}

module.exports = BrowserManager;
