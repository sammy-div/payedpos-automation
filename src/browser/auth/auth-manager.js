const fs = require('fs');
const path = require('path');
const { getConfig } = require('../../config/env');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');
const { withRetry } = require('../../utils/retry');

class AuthManager {
  constructor() {
    this.config = getConfig();
    this.storagePath = this.config.storageStatePath;
    this.ensureStorageDirectory();
  }

  ensureStorageDirectory() {
    const storageDir = path.dirname(this.storagePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  }

  async ensureAuthenticated(page) {
    if (!this.config.username || !this.config.password) {
      throw new AutomationError('Missing PayedPOS credentials in environment variables');
    }

    await page.goto(this.config.baseUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });

    if (await this.isLoginPage(page)) {
      await this.login(page);
    } else {
      logger.info('auth.reuse', { storagePath: this.storagePath });
    }

    return true;
  }

  async isLoginPage(page) {
    const url = page.url().toLowerCase();
    if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
      return true;
    }

    const loginSelectors = [
      'input[type="password"]',
      'input[name*="password"]',
      'input[name*="user"]',
      'input[name*="email"]',
      'button[type="submit"]'
    ];

    for (const selector of loginSelectors) {
      if (await page.locator(selector).count()) {
        return true;
      }
    }

    return false;
  }

  async login(page) {
    logger.info('auth.login.start', { baseUrl: this.config.baseUrl });

    await withRetry(async () => {
      await page.goto(this.config.baseUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
      await page.waitForTimeout(1000);
      logger.info('auth.login.placeholder', { message: 'Authentication flow scaffolded; implement real selectors when target site is available.' });
    }, { retries: this.config.maxRetries });

    await page.context().storageState({ path: this.storagePath });
    logger.info('auth.login.success', { storagePath: this.storagePath });
  }

  async refreshSession(page) {
    logger.warn('auth.session.expired', { message: 'Session refresh is scaffolded; implement actual detection logic when the site is available.' });
    await this.login(page);
  }
}

module.exports = AuthManager;
