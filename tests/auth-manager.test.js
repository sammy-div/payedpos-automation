const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'auth-site');

/**
 * Tiny static file server for the local fixture site (sign-in + dashboard
 * pages). No external dependencies - just enough to let a real browser
 * navigate to fixed, known routes the same way it would against a real
 * deployment.
 */
function startFixtureServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const routePath = req.url === '/' ? '/index.html' : req.url;
      const filePath = path.join(FIXTURE_ROOT, routePath, routePath.endsWith('.html') ? '' : 'index.html');

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
    });

    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/**
 * This repo's Playwright browsers are installed via a separate
 * `npm run setup:playwright` step (see package.json), not automatically
 * on `npm install` (modern Playwright no longer downloads on install).
 * Resolve the default executable path Playwright would use, and skip
 * gracefully if it isn't there rather than failing the whole suite.
 */
function resolveInstalledChromium() {
  try {
    // eslint-disable-next-line global-require
    const { chromium } = require('playwright');
    const executablePath = chromium.executablePath();
    if (executablePath && fs.existsSync(executablePath)) {
      return executablePath;
    }
  } catch {
    // playwright itself isn't resolvable for some reason - fall through to skip.
  }
  return null;
}

test('AuthManager: real login flow against a local fixture site', async (t) => {
  const executablePath = resolveInstalledChromium();
  if (!executablePath) {
    t.skip('No installed Playwright Chromium found - run `npm run setup:playwright` to enable this test.');
    return;
  }

  const { chromium } = require('playwright');
  const server = await startFixtureServer();
  const { port } = server.address();

  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payedpos-auth-test-'));

  const withEnv = async (env, fn) => {
    const previous = {};
    for (const [key, value] of Object.entries(env)) {
      previous[key] = process.env[key];
      process.env[key] = value;
    }
    // AuthManager reads config fresh via getConfig() on construction, so a
    // new instance per env change picks up these values correctly.
    delete require.cache[require.resolve('../src/config/env')];
    delete require.cache[require.resolve('../src/browser/auth/auth-manager')];
    try {
      return await fn();
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };

  const browser = await chromium.launch();

  await t.test('detects and reports a genuine credential rejection, without retrying', async () => {
    await withEnv(
      {
        PAYEDPOS_BASE_URL: `http://127.0.0.1:${port}`,
        PAYEDPOS_LOGIN_PATH: '/sign-in',
        PAYEDPOS_USERNAME: 'wrong@example.com',
        PAYEDPOS_PASSWORD: 'wrong-password',
        PAYEDPOS_STORAGE_STATE_PATH: path.join(storageDir, 'fail-state.json'),
        PAYEDPOS_TIMEOUT: '5000',
        PAYEDPOS_MAX_RETRIES: '2',
      },
      async () => {
        const AuthManager = require('../src/browser/auth/auth-manager');
        const context = await browser.newContext();
        const page = await context.newPage();

        const start = Date.now();
        await assert.rejects(
          () => new AuthManager().ensureAuthenticated(page),
          (err) => {
            assert.equal(err.name, 'InvalidCredentialsError');
            assert.match(err.details.message, /Invalid email or password/);
            return true;
          }
        );
        const elapsedMs = Date.now() - start;

        // A retry loop (maxRetries=2, each attempt re-navigating + waiting)
        // would take substantially longer than one immediate rejection.
        assert.ok(elapsedMs < 3000, `expected a fast single attempt, took ${elapsedMs}ms`);

        await context.close();
      }
    );
  });

  await t.test('signs in successfully and persists session state', async () => {
    await withEnv(
      {
        PAYEDPOS_BASE_URL: `http://127.0.0.1:${port}`,
        PAYEDPOS_LOGIN_PATH: '/sign-in',
        PAYEDPOS_USERNAME: 'valid@example.com',
        PAYEDPOS_PASSWORD: 'correct-password',
        PAYEDPOS_STORAGE_STATE_PATH: path.join(storageDir, 'success-state.json'),
        PAYEDPOS_TIMEOUT: '5000',
      },
      async () => {
        const AuthManager = require('../src/browser/auth/auth-manager');
        const context = await browser.newContext();
        const page = await context.newPage();

        const result = await new AuthManager().ensureAuthenticated(page);

        assert.equal(result, true);
        assert.match(page.url(), /\/dashboard/);
        assert.ok(fs.existsSync(path.join(storageDir, 'success-state.json')), 'session storage state should be saved');

        await context.close();
      }
    );
  });

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(storageDir, { recursive: true, force: true });
});
