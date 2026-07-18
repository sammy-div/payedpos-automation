/**
 * Entry point for the GitHub-Actions-triggered automation run.
 *
 * The workflow (.github/workflows/automation.yml) calls exactly this file
 * and nothing else - `npx tsx automation/index.ts`. Every other module in
 * this folder is orchestrated from here.
 */

import { log, getAutomationEnv } from './utils';
import { startAuthenticatedSession, closeSession, type AuthenticatedSession } from './session';
import { navigateToRoute } from './dashboard';
import { scrapeRoute } from './scraper';
import { parseAndValidate } from './parser';
import { uploadResults, reportFailure, reportStarted } from './uploader';

async function run(): Promise<void> {
  const startedAt = new Date().toISOString();
  const env = getAutomationEnv();
  log.info('workflow.started', { route: env.route, triggeredBy: env.triggeredBy, githubRunId: env.githubRunId });

  const uploadCtx = {
    ingestApiUrl: env.ingestApiUrl,
    ingestApiSecret: env.ingestApiSecret,
    githubRunId: env.githubRunId,
    triggeredBy: env.triggeredBy,
  };

  await reportStarted(env.route, uploadCtx, startedAt);

  let session: AuthenticatedSession | undefined;

  try {
    session = await startAuthenticatedSession();
    log.info('login.result', { sessionReused: session.sessionReused });

    await navigateToRoute(session.page, env.route);

    log.info('extraction.started', { route: env.route });
    const scraped = await scrapeRoute(session.page, { paginate: true });

    const payload = parseAndValidate(env.route, scraped);
    log.info('extraction.completed', { route: env.route, recordCount: payload.recordCount });

    const uploadResult = await uploadResults(payload, uploadCtx, startedAt);

    log.success('workflow.completed', {
      route: env.route,
      recordCount: payload.recordCount,
      runId: uploadResult.runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('workflow.failed', { message, name: error instanceof Error ? error.name : 'UnknownError' });

    // Best-effort: report the failure so it's visible in the dashboard's
    // execution history, not just in this GitHub Actions run's own log.
    await reportFailure(env.route, message, uploadCtx, startedAt);

    throw error;
  } finally {
    // Always close the browser, whether the run succeeded or threw - an
    // unclosed browser process would otherwise just hang the GitHub
    // Actions job until it times out.
    if (session) {
      await closeSession(session);
    }
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    // The specific error was already logged inside run() before this
    // catch runs - nothing more to log here, just ensure a non-zero exit
    // so GitHub Actions correctly marks the job as failed.
    process.exit(1);
  });
