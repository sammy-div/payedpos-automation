/**
 * Session handling for the automation run.
 *
 * The actual reuse/expiry logic already exists and is already verified
 * (see src/browser/browser-manager.js and src/browser/auth/auth-manager.js):
 * - BrowserManager.launch() restores storageState from disk into a fresh
 *   browser context if a saved session file exists.
 * - AuthManager.ensureAuthenticated() then navigates to the sign-in route
 *   and checks whether the restored session is still valid (the real
 *   site redirects away from /sign-in when already authenticated) or
 *   expired (still shows the sign-in form despite the restored cookies -
 *   in which case it logs in fresh and saves a new storage state).
 *
 * What's specific to running in GitHub Actions: each run starts on a
 * completely fresh, ephemeral VM with no files from any previous run.
 * The storage-state file has nothing to restore *unless* something
 * external persists it between runs. This project uses actions/cache in
 * the workflow (see .github/workflows/automation.yml) keyed so it
 * survives across runs; this module doesn't need to know that's
 * happening, it just reads/writes the same path either way.
 *
 * If GitHub Actions caching turns out to be unreliable for this site
 * (e.g. the real dashboard invalidates sessions after a very short time,
 * making the cache rarely useful), the fallback is exactly what already
 * happens automatically: AuthManager detects the expired session and logs
 * in fresh every run. Nothing breaks either way - reuse is a pure
 * optimization on top of a working fresh-login path, not a requirement.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BrowserManager = require('../src/browser/browser-manager');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getConfig } = require('../src/config/env');

import type { Browser, BrowserContext, Page } from 'playwright';
import { log } from './utils';
import { login } from './login';
import fs from 'node:fs';

export interface AuthenticatedSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionReused: boolean;
}

export async function startAuthenticatedSession(): Promise<AuthenticatedSession> {
  const config = getConfig();
  const hadCachedSession = fs.existsSync(config.storageStatePath);

  const browserManager = new BrowserManager();
  const { browser, context, page }: { browser: Browser; context: BrowserContext; page: Page } =
    await browserManager.launch();

  await login(page);

  // If a cached session existed AND we're not currently sitting on the
  // sign-in page, the restored cookies were actually still valid - a real
  // reuse, not just an attempted one.
  const url = page.url().toLowerCase();
  const stillOnSignIn = url.includes(String(config.loginPath).replace(/^\//, ''));
  const sessionReused = hadCachedSession && !stillOnSignIn;

  log.info('session.ready', { hadCachedSession, sessionReused });

  return { browser, context, page, sessionReused };
}

export async function closeSession(session: Pick<AuthenticatedSession, 'browser' | 'context'>): Promise<void> {
  const browserManager = new BrowserManager();
  await browserManager.close(session.browser, session.context);
}
