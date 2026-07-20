"use server";

import { automationClient, isAutomationHostConfigured } from "@/lib/automation-client";
import { dispatchWorkflow, hasActiveRun, isGithubActionsConfigured } from "@/lib/github-actions-client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { SnapshotComparisonResult } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function runExportAction(route: string, formats: Array<"excel" | "word" | "snapshot">): Promise<ActionResult> {
  // GitHub Actions is the primary path going forward - see
  // .github/workflows/automation.yml. The always-on-host path
  // (AUTOMATION_API_URL) remains as a fallback for anyone still running
  // src/server.js directly instead.
  if (isGithubActionsConfigured()) {
    try {
      if (await hasActiveRun()) {
        return { ok: false, message: "A run is already in progress. Try again once it finishes." };
      }
      await dispatchWorkflow({ route, triggeredBy: "manual" });
      return { ok: true, message: `Workflow started for "${route}". Check back shortly for results.` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Failed to start the workflow." };
    }
  }

  if (!isAutomationHostConfigured()) {
    return {
      ok: false,
      message:
        "No automation host connected yet. Configure GitHub Actions (see .github/workflows/automation.yml) or set AUTOMATION_API_URL to a deployed Playwright server.",
    };
  }

  try {
    // The automation host responds as soon as the run *starts* (HTTP 202),
    // not when it finishes - a full export can take 60-100+ seconds, well
    // beyond what a Vercel function should ever block on. The caller polls
    // /api/status (see components/task-card.tsx) for the actual result.
    await automationClient.runExport({ route, formats });
    return { ok: true, message: `Export started for "${route}". Watching for progress…` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to start export." };
  }
}

export async function runSearchAction(route: string, query: string): Promise<ActionResult> {
  if (!isAutomationHostConfigured()) {
    return {
      ok: false,
      message: "No automation host connected yet. Set AUTOMATION_API_URL to search live data.",
    };
  }

  try {
    await automationClient.runSearch({ route, query });
    return { ok: true, message: `Search started on "${route}". Watching for progress…` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to start search." };
  }
}

export interface CompareResult extends ActionResult {
  comparison?: SnapshotComparisonResult;
}

export async function compareSnapshotsAction(runId1: string, runId2: string): Promise<CompareResult> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();

      const [before, after] = await Promise.all([
        supabase.from("extracted_records").select("data").eq("run_id", runId1),
        supabase.from("extracted_records").select("data").eq("run_id", runId2),
      ]);

      if (before.error) throw before.error;
      if (after.error) throw after.error;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SnapshotComparison = require("../src/snapshots/snapshot-comparison");

      const comparison = SnapshotComparison.compare(
        { rows: before.data.map((r) => r.data) },
        { rows: after.data.map((r) => r.data) }
      ) as SnapshotComparisonResult;

      return { ok: true, message: "Comparison complete.", comparison };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Comparison failed." };
    }
  }

  if (!isAutomationHostConfigured()) {
    return {
      ok: false,
      message: "No automation host connected yet. Set AUTOMATION_API_URL to compare live snapshots.",
    };
  }

  try {
    await automationClient.compareSnapshots({ snapshot1: runId1, snapshot2: runId2 });
    return { ok: true, message: "Comparison complete." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Comparison failed." };
  }
}
