const { getConfig } = require('../../config/env');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

const ROUTES = {
  dashboard: '/',
  'pos-terminals': '/pos-terminals',
  assigned: '/assigned',
  unassigned: '/unassigned',
  merchants: '/merchants'
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
