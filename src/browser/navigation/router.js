const { getConfig } = require('../../config/env');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

// Confirmed directly against the real site (this sandbox can't reach it
// itself - see project history). Only routes the user has actually
// verified are listed here; nothing is guessed. Add more as they're
// confirmed, or see the discoverRoutes() note below for a longer-term,
// non-hardcoded alternative.
const ROUTES = {
  dashboard: '/dashboard',
  'pos-terminals-assigned': '/dashboard/pos-terminals/assigned',
  transactions: '/dashboard/transactions',
  locations: '/dashboard/locations'
};

class NavigationRouter {
  constructor() {
    this.config = getConfig();
  }

  async navigate(page, routeName, options = {}) {
    const routePath = ROUTES[routeName.toLowerCase()];
    if (!routePath) {
      throw new AutomationError(`Unknown route: ${routeName}`);
    }

    const targetUrl = new URL(routePath, this.config.baseUrl).toString();
    logger.info('navigation.route', { route: routeName, url: targetUrl });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
    await page.waitForLoadState('networkidle', { timeout: this.config.timeout }).catch(() => {});
    return targetUrl;
  }
}

module.exports = { NavigationRouter, ROUTES };
