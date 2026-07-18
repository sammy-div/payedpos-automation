# GitHub Actions Automation

This is the primary way this project runs Playwright: a GitHub Actions
workflow, triggered manually or from the dashboard's "Run" button, that
logs into PayedPOS, extracts data, and sends it to the Next.js app's
`/api/ingest` endpoint for storage in Supabase.

Playwright never runs on Vercel itself - Vercel serverless functions
aren't built for a persistent headless browser (see the architecture
notes in the main [README](../README.md)). GitHub Actions runners are a
good fit instead: they're free for reasonable usage, spin up on demand,
and disappear when done - no server to maintain, pay for, or keep patched.

## Architecture

```
User clicks "Refresh Data" in the dashboard
        │
        ▼
Server Action (lib/actions.ts) calls dispatchWorkflow() directly
        │  (or an external caller hits POST /api/refresh with the shared secret)
        ▼
GitHub Actions workflow starts (.github/workflows/automation.yml)
        │
        ▼
automation/index.ts orchestrates:
  1. session.ts   - restore cached session or log in fresh
  2. dashboard.ts - navigate to the requested route
  3. scraper.ts   - extract the table, following pagination
  4. parser.ts    - validate and normalize the rows
  5. uploader.ts  - POST the result to /api/ingest
        │
        ▼
/api/ingest writes to Supabase (automation_runs + extracted_records)
        │
        ▼
Dashboard polls /api/status?route=... and reads from Supabase directly
for run history - no code changes needed, it just shows up
```

## Folder structure

```
automation/
  index.ts     - single entry point; the workflow calls only this
  utils.ts     - structured logging (reuses src/utils/logger.js), env validation
  session.ts   - browser lifecycle + session reuse/expiry (wraps src/browser/*)
  login.ts     - thin wrapper around src/browser/auth/auth-manager.js
  dashboard.ts - thin wrapper around src/browser/navigation/router.js
  scraper.ts   - thin wrapper around TableExtractor + PaginationEngine
  parser.ts    - validates/normalizes scraped rows before upload
  uploader.ts  - HTTPS upload with auth, timeout, and retry

.github/workflows/automation.yml   - the workflow itself
app/api/refresh/route.ts           - triggers a workflow run
app/api/ingest/route.ts            - receives results, writes to Supabase
lib/github-actions-client.ts       - GitHub REST API client (dispatch, check active run)
lib/supabase.ts                    - Supabase client (server-only, service_role key)
lib/auth-helpers.ts                - shared constant-time secret comparison
supabase/schema.sql                - run once in the Supabase SQL Editor
```

`automation/*.ts` are deliberately thin wrappers around the existing
`src/` modules, not a rewrite. The actual login, navigation, extraction,
and pagination logic already existed, was already verified against the
real site's markup, and is reused as-is - see the main README for how
each of those was built and tested.

## Required GitHub repository secrets

Settings → Secrets and variables → Actions → New repository secret.
The workflow reads these directly; the Next.js app never sees them.

| Secret | Value |
|---|---|
| `PAYEDPOS_USERNAME` | PayedPOS login email |
| `PAYEDPOS_PASSWORD` | PayedPOS login password |
| `PAYEDPOS_BASE_URL` | `https://payedpos.vercel.app` (or your instance) |
| `PAYEDPOS_LOGIN_PATH` | Optional, defaults to `/sign-in` if unset |
| `INGEST_API_URL` | `https://your-app.vercel.app/api/ingest` |
| `INGEST_API_SECRET` | Must exactly match the Vercel env var of the same name |

## Required Vercel environment variables

Project Settings → Environment Variables.

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | Fine-grained PAT scoped to this repo, "Actions: Read and write" |
| `GITHUB_OWNER` | Your GitHub username or org |
| `GITHUB_REPO` | This repo's name |
| `GITHUB_WORKFLOW_FILE` | Optional, defaults to `automation.yml` |
| `GITHUB_WORKFLOW_REF` | Optional, defaults to `main` |
| `REFRESH_TRIGGER_SECRET` | Random secret (`openssl rand -hex 32`) - protects `/api/refresh` |
| `INGEST_API_SECRET` | Random secret - must match the GitHub secret of the same name |
| `SUPABASE_URL` | Supabase project URL (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (Settings → API) - **never** the `anon` key |

See `.env.example` for the full annotated list, including which values
are shared between the two systems.

## Deployment steps

1. **Create the Supabase project and run the schema.** Supabase dashboard
   → SQL Editor → paste the contents of `supabase/schema.sql` → Run.
   This only needs to happen once per project.
2. **Generate two random secrets** for `REFRESH_TRIGGER_SECRET` and
   `INGEST_API_SECRET` (`openssl rand -hex 32` for each - they should be
   different from each other).
3. **Create a GitHub PAT.** Fine-grained token, scoped to this one repo,
   with **Actions: Read and write** permission (needed to dispatch the
   workflow and check for in-progress runs). Nothing else is needed.
4. **Set the Vercel environment variables** listed above, then redeploy
   (or it'll pick them up on the next deploy automatically).
5. **Set the GitHub repository secrets** listed above. `INGEST_API_URL`
   is your live Vercel URL + `/api/ingest` - you'll know this once step 4
   is deployed.
6. **Run the workflow once manually** (Actions tab → PayedPOS Automation
   → Run workflow) to confirm everything's wired up before relying on the
   dashboard button. Check the run's logs, and check that a row appeared
   in Supabase's `automation_runs` table.
7. **Try the dashboard's "Run" button** on the Automations page - it
   should show "Workflow started..." and the Automations page's run
   history should update once the workflow completes.

## Local testing

You can run the automation script directly, without GitHub Actions, to
test against a real or local target:

```bash
PAYEDPOS_BASE_URL=https://payedpos.vercel.app \
PAYEDPOS_USERNAME=you@example.com \
PAYEDPOS_PASSWORD=your-password \
AUTOMATION_ROUTE=transactions \
AUTOMATION_TRIGGERED_BY=manual \
INGEST_API_URL=https://your-app.vercel.app/api/ingest \
INGEST_API_SECRET=your-secret \
npx tsx automation/index.ts
```

You'll need Playwright's browser installed locally first:
`npm run setup:playwright`.

To test without hitting the real site or a real ingest endpoint at all
(useful for verifying the pipeline mechanics - login flow, pagination,
upload retry behavior - without touching anything real), point
`PAYEDPOS_BASE_URL` and `INGEST_API_URL` at local servers serving static
fixture HTML. `tests/fixtures/auth-site/` has a working example of the
sign-in page shape this expects.

Run the automated test suite (unit tests for the extractor, report
generators, uploader retry logic, and - if you have a matching Playwright
browser installed - a full login/session-reuse integration test):

```bash
npm test
```

## Troubleshooting

**Workflow runs but the dashboard never shows the result.**
Check that `INGEST_API_SECRET` matches exactly between the GitHub secret
and the Vercel env var - a mismatch here fails silently from the
dashboard's perspective (the workflow's own Actions log will show a 401
from `/api/ingest` though, so check there first).

**`/api/refresh` returns 502 "GITHUB_TOKEN, GITHUB_OWNER, and
GITHUB_REPO must all be set".**
One of those three Vercel env vars is missing or the deployment hasn't
picked up a recent env var change yet - redeploy after setting them.

**Workflow fails immediately with "Missing required environment
variable: AUTOMATION_ROUTE" (or similar).**
The workflow wasn't given a `route` input - this shouldn't happen via
the dashboard or the "Run workflow" UI (both require selecting one), but
can happen if the REST API is called directly without an `inputs.route`
value in the request body.

**Login fails with "PayedPOS rejected the provided credentials".**
This is deliberately not retried (see `automation/login.ts` and
`src/browser/auth/auth-manager.js` for why) - check
`PAYEDPOS_USERNAME`/`PAYEDPOS_PASSWORD` are correct GitHub secrets, not
stale or truncated.

**Login fails with a timeout, no toast, no redirect.**
Usually means the real sign-in page's markup changed (different
selectors, different toast library) - see the "Vercel Readiness /
technical debt" notes in the main README for what to do when that
happens: this needs real inspection of the current page, not guessing.

**Session reuse never seems to kick in (`sessionReused: false` every
run).** Check the "Restore cached session" / "Save session for next run"
steps actually ran in the workflow log without errors. If the cache
looks fine but reuse still isn't happening, it's possible the real site
invalidates sessions faster than the ~few hours between runs - in that
case, this is expected: fresh login every run is the correct fallback,
not a bug (see the design note at the top of `automation/session.ts`).

**A run seems stuck "running" forever in the dashboard.**
Either the workflow is still genuinely running (check the Actions tab -
the job has a 15 minute timeout), or it crashed in a way that didn't
reach `reportFailure()` (e.g. the runner itself was killed). Check
`automation_runs` in Supabase directly, or add an application-level
safeguard (e.g. treat any `running` row older than the workflow timeout
as stale) if this becomes a recurring issue.

**xlsx/docx report downloads don't reflect new data from GitHub
Actions.** Expected for now - `getReports()`/`getSnapshots()` in
`lib/data-source.ts` still only read from the older always-on-host
model. Generating reports on demand from the rows now stored in
Supabase is a real, separate piece of work, not yet built - see the
comment in `lib/data-source.ts` for exactly what's missing.
