const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

/**
 * uploader.ts is TypeScript, and this test suite runs on plain Node
 * (node --test, no TS loader configured at the repo root). Rather than
 * adding a TS-aware test runner just for this one file, register tsx's
 * loader inline so this test can import the real .ts module directly.
 */
require('tsx/cjs');
const { uploadResults, reportFailure, reportStarted } = require('../automation/uploader.ts');

function startTestServer() {
  const state = { fail500Count: 0, requests: [] };

  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const parsed = JSON.parse(body || '{}');
    state.requests.push(parsed);

    if (req.url === '/fail-400') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad secret' }));
      return;
    }

    if (req.url === '/fail-500-then-succeed') {
      state.fail500Count += 1;
      if (state.fail500Count < 3) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'transient' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ runId: 'run-abc', recordCount: parsed.recordCount }));
      return;
    }

    if (req.url === '/success') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ runId: 'run-xyz', recordCount: parsed.recordCount }));
      return;
    }

    if (req.url === '/always-fails') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'still down' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state }));
  });
}

const basePayload = {
  route: 'transactions',
  scrapedAt: new Date().toISOString(),
  headers: ['Name'],
  rows: [{ Name: 'Alpha' }],
  recordCount: 1,
};
const startedAt = new Date().toISOString();

test('uploadResults: does not retry a 4xx response', async () => {
  const { server, port } = await startTestServer();
  try {
    const start = Date.now();
    await assert.rejects(
      () =>
        uploadResults(
          basePayload,
          { ingestApiUrl: `http://127.0.0.1:${port}/fail-400`, ingestApiSecret: 'whatever', githubRunId: null, triggeredBy: 'manual' },
          startedAt
        ),
      (err) => {
        assert.equal(err.name, 'UploadError');
        assert.equal(err.nonRetryable, true);
        return true;
      }
    );
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `expected a fast single attempt with no retry delay, took ${elapsed}ms`);
  } finally {
    server.close();
  }
});

test('uploadResults: retries a 5xx response and eventually succeeds', async () => {
  const { server, port } = await startTestServer();
  try {
    const result = await uploadResults(
      basePayload,
      { ingestApiUrl: `http://127.0.0.1:${port}/fail-500-then-succeed`, ingestApiSecret: 'whatever', githubRunId: 'gh-123', triggeredBy: 'api' },
      startedAt
    );
    assert.equal(result.runId, 'run-abc');
    assert.equal(result.recordCount, 1);
  } finally {
    server.close();
  }
});

test('uploadResults: succeeds immediately with no retries needed', async () => {
  const { server, port } = await startTestServer();
  try {
    const result = await uploadResults(
      basePayload,
      { ingestApiUrl: `http://127.0.0.1:${port}/success`, ingestApiSecret: 'whatever', githubRunId: null, triggeredBy: 'schedule' },
      startedAt
    );
    assert.equal(result.runId, 'run-xyz');
  } finally {
    server.close();
  }
});

test('uploadResults: sends status "success" and the started/scraped timestamps', async () => {
  const { server, port, state } = await startTestServer();
  try {
    await uploadResults(
      basePayload,
      { ingestApiUrl: `http://127.0.0.1:${port}/success`, ingestApiSecret: 'whatever', githubRunId: null, triggeredBy: 'manual' },
      startedAt
    );
    assert.equal(state.requests[0].status, 'success');
    assert.equal(state.requests[0].startedAt, startedAt);
    assert.equal(state.requests[0].scrapedAt, basePayload.scrapedAt);
  } finally {
    server.close();
  }
});

test('reportStarted: sends status "running" with no rows/error fields', async () => {
  const { server, port, state } = await startTestServer();
  try {
    await reportStarted(
      'transactions',
      { ingestApiUrl: `http://127.0.0.1:${port}/success`, ingestApiSecret: 'whatever', githubRunId: 'gh-42', triggeredBy: 'manual' },
      startedAt
    );
    assert.equal(state.requests.length, 1);
    assert.equal(state.requests[0].status, 'running');
    assert.equal(state.requests[0].route, 'transactions');
    assert.equal(state.requests[0].startedAt, startedAt);
    assert.equal(state.requests[0].githubRunId, 'gh-42');
    assert.equal(state.requests[0].rows, undefined);
    assert.equal(state.requests[0].errorMessage, undefined);
  } finally {
    server.close();
  }
});

test('reportFailure: sends status "error" with the error message, and never throws even if reporting itself fails', async () => {
  const { server, port, state } = await startTestServer();
  try {
    // Should not throw, even though this endpoint always fails - reportFailure
    // is deliberately best-effort so a failure to *report* a failure doesn't
    // mask or replace the original error already being propagated.
    await reportFailure(
      'transactions',
      'Timed out waiting for a sign-in result',
      { ingestApiUrl: `http://127.0.0.1:${port}/always-fails`, ingestApiSecret: 'whatever', githubRunId: 'gh-999', triggeredBy: 'schedule' },
      startedAt
    );
    assert.ok(state.requests.length > 0, 'should have attempted at least one request');
    assert.equal(state.requests[0].status, 'error');
    assert.equal(state.requests[0].errorMessage, 'Timed out waiting for a sign-in result');
  } finally {
    server.close();
  }
});
