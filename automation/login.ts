/**
 * Login handling - thin wrapper around the existing, already-verified
 * AuthManager (src/browser/auth/auth-manager.js).
 *
 * That module already implements everything this needs: navigating to
 * the real sign-in page, filling the real #email/#password fields,
 * detecting a genuine credential rejection via the site's toast
 * notification (and deliberately NOT retrying that case - see its
 * comments for why), and saving the resulting session state. This file
 * exists just to give the GitHub Actions automation a clearly-named,
 * TypeScript-typed entry point, per the requested module layout, rather
 * than reaching into src/ directly from every other module.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AuthManager = require('../src/browser/auth/auth-manager');

import type { Page } from 'playwright';
import { log } from './utils';

export async function login(page: Page): Promise<void> {
  const authManager = new AuthManager();

  try {
    await authManager.ensureAuthenticated(page);
  } catch (error) {
    // AuthManager.InvalidCredentialsError is a distinct type specifically
    // so callers can tell "credentials were rejected" apart from other
    // failures (network issues, timeouts) - surfacing that distinction
    // here too rather than flattening every failure into one message.
    const isInvalidCredentials = error instanceof AuthManager.InvalidCredentialsError;
    log.error('login.failed', {
      reason: isInvalidCredentials ? 'invalid_credentials' : 'other',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
