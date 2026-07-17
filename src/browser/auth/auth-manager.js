const fs = require('fs');
const path = require('path');
const { getConfig } = require('../../config/env');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');
const { withRetry } = require('../../utils/retry');

// Selectors match the real PayedPOS sign-in page (a statically-exported
// Next.js app): a plain email/password form with no CSRF token or hidden
// fields, submitted via client-side JS rather than a native form POST.
const SELECTORS = {
  emailInput: '#email',
  passwordInput: '#password',
  submitButton: 'button[type="submit"]',
  // Errors surface as a toast in this region rather than inline field
  // validation - this aria-label is Sonner's (the toast library) default.
  notificationRegion: '[aria-label="Notifications (F8)"]'
};

/**
 * Thrown when the credentials themselves were rejected (as opposed to a
 * transient/navigation failure). Deliberately NOT retried - resubmitting
 * bad credentials automatically risks tripping a lockout or rate limit on
 * the real site.
 */
class InvalidCredentialsError extends AutomationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'InvalidCredentialsError';
  }
}

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

  get loginUrl() {
    return new URL(this.config.loginPath, this.config.baseUrl).toString();
  }

  async ensureAuthenticated(page) {
    if (!this.config.username || !this.config.password) {
      throw new AutomationError('Missing PayedPOS credentials in environment variables');
    }

    // Navigate to the known sign-in route directly, rather than assuming
    // baseUrl (root) redirects there for an unauthenticated session - we
    // don't actually know root's behavior, but the sign-in route itself
    // is confirmed. If a session is already valid, most apps redirect
    // *away* from a sign-in page when you're already authenticated, which
    // isLoginPage() below will correctly detect as "not on sign-in".
    await page.goto(this.loginUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });

    if (await this.isLoginPage(page)) {
      await this.login(page);
    } else {
      logger.info('auth.reuse', { storagePath: this.storagePath });
    }

    return true;
  }

  async isLoginPage(page) {
    const url = page.url().toLowerCase();
    if (url.includes(this.config.loginPath.replace(/^\//, ''))) {
      return true;
    }

    return Boolean(await page.locator(SELECTORS.emailInput).count()) &&
      Boolean(await page.locator(SELECTORS.passwordInput).count());
  }

  async login(page) {
    logger.info('auth.login.start', { loginUrl: this.loginUrl });

    // Navigation itself is reasonably safe to retry (transient network
    // issues, slow cold starts, etc). Submitting the form is not - see
    // submitCredentials().
    await withRetry(async () => {
      await page.goto(this.loginUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
      await page.locator(SELECTORS.emailInput).waitFor({ state: 'visible', timeout: this.config.timeout });
    }, { retries: this.config.maxRetries });

    await this.submitCredentials(page);

    await page.context().storageState({ path: this.storagePath });
    logger.info('auth.login.success', { storagePath: this.storagePath });
  }

  /**
   * Fill and submit the sign-in form exactly once, then wait for either a
   * successful redirect away from the login page or an error toast. Not
   * wrapped in withRetry deliberately: if the credentials are genuinely
   * wrong, we want to fail loudly on the first attempt, not silently
   * resubmit them.
   */
  async submitCredentials(page) {
    await page.locator(SELECTORS.emailInput).fill(this.config.username);
    await page.locator(SELECTORS.passwordInput).fill(this.config.password);
    await page.locator(SELECTORS.submitButton).click();

    const outcome = await Promise.race([
      page
        .waitForURL((url) => !url.pathname.toLowerCase().includes(this.config.loginPath.replace(/^\//, '')), {
          timeout: this.config.timeout
        })
        .then(() => ({ type: 'success' })),
      page
        .locator(`${SELECTORS.notificationRegion} li`)
        .first()
        .waitFor({ state: 'visible', timeout: this.config.timeout })
        .then(async () => ({
          type: 'error',
          message: (await page.locator(`${SELECTORS.notificationRegion} li`).first().textContent()) || 'Sign-in failed'
        }))
    ]).catch(() => ({ type: 'timeout' }));

    if (outcome.type === 'error') {
      logger.error('auth.login.rejected', { message: outcome.message });
      throw new InvalidCredentialsError('PayedPOS rejected the provided credentials', { message: outcome.message });
    }

    if (outcome.type === 'timeout') {
      throw new AutomationError(
        'Timed out waiting for a sign-in result (no redirect and no error toast appeared)'
      );
    }
  }

  async refreshSession(page) {
    logger.info('auth.session.refresh', { loginUrl: this.loginUrl });
    await this.login(page);
  }
}

module.exports = AuthManager;
module.exports.InvalidCredentialsError = InvalidCredentialsError;
