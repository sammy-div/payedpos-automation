import type { ParsedPayload } from './parser';
import { log, redact } from './utils';

export class UploadError extends Error {
  status?: number;
  /** True for 4xx responses: retrying identical bad input won't help. */
  nonRetryable: boolean;
  constructor(message: string, status?: number, nonRetryable = false) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.nonRetryable = nonRetryable;
  }
}

export interface UploadContext {
  ingestApiUrl: string;
  ingestApiSecret: string;
  githubRunId: string | null;
  triggeredBy: string;
}

interface IngestResponseBody {
  runId?: string;
  recordCount?: number;
  [key: string]: unknown;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 4; // 1 initial attempt + 3 retries
const RETRY_DELAY_MS = 1_000;

async function postJsonOnce(body: Record<string, unknown>, ctx: UploadContext): Promise<IngestResponseBody> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ctx.ingestApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.ingestApiSecret}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    let parsed: IngestResponseBody = {};
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // Non-JSON response body - fall through with the raw text captured
      // in the thrown error below rather than crashing on .json().
    }

    if (!response.ok) {
      const message = `Ingest API rejected the request (${response.status}): ${bodyText.slice(0, 500)}`;
      // 4xx = something about THIS request is wrong (bad secret, bad
      // payload shape) - retrying identical bad input won't help.
      // 5xx / network errors are the only genuinely retryable cases.
      const nonRetryable = response.status >= 400 && response.status < 500;
      throw new UploadError(message, response.status, nonRetryable);
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Posts with retries limited to genuinely transient failures. A small,
 * dedicated retry loop rather than a reuse of src/utils/retry.js's
 * withRetry() - that helper retries every thrown error unconditionally
 * with no concept of "don't retry this one," which is exactly wrong here:
 * a rejected secret or malformed payload (4xx) should fail once, clearly,
 * not get resubmitted three more times against the same bad input.
 */
async function postWithRetry(
  body: Record<string, unknown>,
  ctx: UploadContext,
  logContext: Record<string, unknown>
): Promise<IngestResponseBody> {
  log.info('uploader.start', { ...logContext, url: redact(ctx.ingestApiUrl) });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await postJsonOnce(body, ctx);
      log.success('uploader.complete', { ...logContext, runId: result.runId, attempt });
      return result;
    } catch (error) {
      lastError = error;
      const nonRetryable = error instanceof UploadError && error.nonRetryable;
      const isLastAttempt = attempt === MAX_ATTEMPTS;

      log.warn('uploader.attempt_failed', {
        ...logContext,
        attempt,
        nonRetryable,
        message: error instanceof Error ? error.message : String(error),
      });

      if (nonRetryable || isLastAttempt) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  log.error('uploader.failed', {
    ...logContext,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError;
}

/**
 * Reports that a run has started, before any extraction happens. Without
 * this, Supabase would have no row at all for a run until it finishes
 * (success or error) - meaning the dashboard's polling UI could never
 * distinguish "still running" from "nothing happened yet." Best-effort,
 * same reasoning as reportFailure(): a failure to report "started"
 * shouldn't abort the actual run.
 */
export async function reportStarted(route: string, ctx: UploadContext, startedAt: string): Promise<void> {
  try {
    await postWithRetry(
      {
        status: 'running',
        route,
        startedAt,
        githubRunId: ctx.githubRunId,
        triggeredBy: ctx.triggeredBy,
      },
      ctx,
      { route, reporting: 'started' }
    );
  } catch (error) {
    log.error('uploader.start_report_failed', {
      route,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function uploadResults(
  payload: ParsedPayload,
  ctx: UploadContext,
  startedAt: string
): Promise<IngestResponseBody> {
  return postWithRetry(
    {
      status: 'success',
      route: payload.route,
      startedAt,
      scrapedAt: payload.scrapedAt,
      headers: payload.headers,
      rows: payload.rows,
      recordCount: payload.recordCount,
      githubRunId: ctx.githubRunId,
      triggeredBy: ctx.triggeredBy,
    },
    ctx,
    { route: payload.route, recordCount: payload.recordCount }
  );
}

/**
 * Reports a failed run so it shows up in the dashboard's execution
 * history - without this, only ever-successful runs would be visible,
 * since a failure never reaches uploadResults() at all (the automation
 * never gets as far as extracting data to upload). Best-effort: if
 * *this* call also fails, the run is still marked failed in the GitHub
 * Actions log/exit code, just not reflected in the dashboard.
 */
export async function reportFailure(
  route: string,
  errorMessage: string,
  ctx: UploadContext,
  startedAt: string
): Promise<void> {
  try {
    await postWithRetry(
      {
        status: 'error',
        route,
        startedAt,
        errorMessage,
        githubRunId: ctx.githubRunId,
        triggeredBy: ctx.triggeredBy,
      },
      ctx,
      { route, reporting: 'failure' }
    );
  } catch (error) {
    log.error('uploader.failure_report_failed', {
      route,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
