import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { extractBearerToken, secretsMatch } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

interface RunningBody {
  status: "running";
  route: string;
  startedAt: string;
  githubRunId: string | null;
  triggeredBy: string;
}

interface SuccessBody {
  status: "success";
  route: string;
  startedAt: string;
  scrapedAt: string;
  headers: string[];
  rows: Record<string, string>[];
  recordCount: number;
  githubRunId: string | null;
  triggeredBy: string;
}

interface ErrorBody {
  status: "error";
  route: string;
  startedAt: string;
  errorMessage: string;
  githubRunId: string | null;
  triggeredBy: string;
}

type IngestBody = RunningBody | SuccessBody | ErrorBody;

function isValidTriggeredBy(value: unknown): value is string {
  return typeof value === "string" && ["manual", "schedule", "api"].includes(value);
}

/**
 * Hand-validates the payload shape rather than trusting it, since this
 * endpoint is reachable by anything that knows the shared secret - not
 * just the GitHub Actions workflow this project ships with.
 */
function validateBody(body: unknown): IngestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.route !== "string" || b.route.length === 0) {
    throw new Error("route is required and must be a non-empty string.");
  }
  if (typeof b.startedAt !== "string") {
    throw new Error("startedAt is required and must be an ISO timestamp string.");
  }
  if (!isValidTriggeredBy(b.triggeredBy)) {
    throw new Error("triggeredBy must be one of: manual, schedule, api.");
  }

  if (b.status === "running") {
    return b as unknown as RunningBody;
  }

  if (b.status === "success") {
    if (!Array.isArray(b.headers) || !b.headers.every((h) => typeof h === "string")) {
      throw new Error("headers must be an array of strings.");
    }
    if (!Array.isArray(b.rows)) {
      throw new Error("rows must be an array.");
    }
    if (typeof b.recordCount !== "number") {
      throw new Error("recordCount must be a number.");
    }
    if (typeof b.scrapedAt !== "string") {
      throw new Error("scrapedAt is required for status=success.");
    }
    return b as unknown as SuccessBody;
  }

  if (b.status === "error") {
    if (typeof b.errorMessage !== "string" || b.errorMessage.length === 0) {
      throw new Error("errorMessage is required for status=error.");
    }
    return b as unknown as ErrorBody;
  }

  throw new Error('status must be "running", "success", or "error".');
}

export async function POST(request: Request) {
  const expectedSecret = process.env.INGEST_API_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "INGEST_API_SECRET is not configured on the server." },
      { status: 500 }
    );
  }

  const provided = extractBearerToken(request.headers.get("authorization"));
  if (!provided || !secretsMatch(provided, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let body: IngestBody;
  try {
    body = validateBody(rawBody);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payload." },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 500 }
    );
  }

  const githubRunId = body.githubRunId ? Number(body.githubRunId) : null;

  // One row per real GitHub Actions run: 'running' inserts it, then
  // 'success'/'error' update that same row via upsert-on-github_run_id
  // (see supabase/schema.sql for why this is a plain, non-partial unique
  // index). Runs with no githubRunId (local/manual testing) never
  // conflict with anything, by standard Postgres NULL semantics, so each
  // such call is always a fresh insert - which is fine, there's no
  // multi-call lifecycle to track outside real GitHub Actions runs.
  const baseRow = {
    route: body.route,
    triggered_by: body.triggeredBy,
    github_run_id: githubRunId,
    started_at: body.startedAt,
  };

  try {
    if (body.status === "running") {
      const { data, error } = await supabase
        .from("automation_runs")
        .upsert({ ...baseRow, status: "running" }, { onConflict: "github_run_id" })
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: `Failed to record run: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ runId: data.id });
    }

    if (body.status === "error") {
      const { data, error } = await supabase
        .from("automation_runs")
        .upsert(
          { ...baseRow, status: "error", error_message: body.errorMessage, finished_at: new Date().toISOString() },
          { onConflict: "github_run_id" }
        )
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: `Failed to record run: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ runId: data.id });
    }

    // body.status === "success"
    const { data: runRow, error: runError } = await supabase
      .from("automation_runs")
      .upsert(
        { ...baseRow, status: "success", record_count: body.recordCount, finished_at: body.scrapedAt },
        { onConflict: "github_run_id" }
      )
      .select("id")
      .single();

    if (runError) {
      return NextResponse.json({ error: `Failed to record run: ${runError.message}` }, { status: 500 });
    }

    if (body.rows.length > 0) {
      const records = body.rows.map((row) => ({
        run_id: runRow.id as string,
        route: body.route,
        data: row,
      }));

      const { error: recordsError } = await supabase.from("extracted_records").insert(records);

      if (recordsError) {
        return NextResponse.json(
          { error: `Run recorded but failed to store extracted rows: ${recordsError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ runId: runRow.id, recordCount: body.recordCount });
  } catch (error) {
    // Catches network-level failures talking to Supabase itself (not
    // query errors, which are already handled above via each call's
    // returned `error` field rather than a thrown exception).
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error writing to Supabase." },
      { status: 500 }
    );
  }
}
