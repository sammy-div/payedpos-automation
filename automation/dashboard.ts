/**
 * Dashboard navigation - thin wrapper around the existing
 * NavigationRouter (src/browser/navigation/router.js).
 *
 * ROUTES there lists only routes actually confirmed against the real
 * site; requesting anything else throws immediately with a clear
 * "Unknown route" error rather than silently navigating somewhere wrong.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NavigationRouter, ROUTES } = require('../src/browser/navigation/router');

import type { Page } from 'playwright';
import { log } from './utils';

export const KNOWN_ROUTES: string[] = Object.keys(ROUTES);

export async function navigateToRoute(page: Page, route: string): Promise<string> {
  const router = new NavigationRouter();
  log.info('dashboard.navigate.start', { route });
  const url: string = await router.navigate(page, route);
  log.info('dashboard.navigate.complete', { route, url });
  return url;
}
