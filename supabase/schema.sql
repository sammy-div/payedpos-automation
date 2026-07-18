-- PayedPOS Operations Assistant - Supabase schema
--
-- Run this once in the Supabase SQL Editor (Settings are per-project, so
-- this only needs to run one time per Supabase project).
--
-- Design notes:
-- - `data` is jsonb, not fixed columns, because different PayedPOS routes
--   have different fields and this project's whole extraction philosophy
--   is "don't hardcode table structure" (see src/browser/extractors).
-- - There's no separate file storage bucket. Reports (.xlsx/.docx) are
--   generated on demand from the stored rows in a Vercel API route,
--   rather than pre-generated and stored as files - simpler, and avoids
--   storing derived data twice.
-- - Snapshot comparison (added/removed/modified between runs) becomes a
--   query over extracted_records for two different run_ids of the same
--   route, rather than comparing JSON files on disk.

-- gen_random_uuid() has been built into Postgres core since v13 (no
-- extension needed) - confirmed directly against a real Postgres engine
-- rather than assumed, since some environments don't have every
-- extension available.

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  status text not null check (status in ('running', 'success', 'error')),
  triggered_by text not null default 'manual' check (triggered_by in ('manual', 'schedule', 'api')),
  github_run_id bigint,
  record_count integer,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- One row per real GitHub Actions run (running -> success/error is an
-- update, not a new insert), matched by github_run_id via upsert.
-- Standard Postgres NULL semantics mean multiple NULLs (local/manual
-- runs without a real GitHub run id) never conflict with each other or
-- with real runs - no partial index needed for that. A plain index is
-- used deliberately rather than a partial one: Supabase JS's
-- .upsert({ onConflict: 'github_run_id' }) generates a plain
-- `ON CONFLICT (github_run_id)` with no predicate, which Postgres will
-- only match against a non-partial unique index (verified directly - a
-- partial index requires its exact WHERE clause to be repeated in the
-- ON CONFLICT clause to be inferred, which Supabase's client doesn't do).
create unique index if not exists idx_automation_runs_github_run_id
  on automation_runs (github_run_id);

create index if not exists idx_automation_runs_route_started
  on automation_runs (route, started_at desc);

create table if not exists extracted_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id) on delete cascade,
  route text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_extracted_records_run
  on extracted_records (run_id);

create index if not exists idx_extracted_records_route_created
  on extracted_records (route, created_at desc);

-- Row-Level Security is enabled with NO policies, deliberately. Every
-- reader/writer in this project (the Vercel app's server-side code, and
-- the GitHub Actions job) uses the service_role key, which bypasses RLS
-- entirely. Enabling RLS with zero policies means that if this key were
-- ever accidentally used from a browser context (anon key context), every
-- query would simply be denied by default, rather than silently exposed.
alter table automation_runs enable row level security;
alter table extracted_records enable row level security;
