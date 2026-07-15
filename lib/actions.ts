"use server";

import { automationClient, isAutomationHostConfigured } from "@/lib/automation-client";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function runExportAction(route: string, formats: Array<"excel" | "word" | "snapshot">): Promise<ActionResult> {
  if (!isAutomationHostConfigured()) {
    return {
      ok: false,
      message:
        "No automation host connected yet. Set AUTOMATION_API_URL to your deployed Playwright server to run this for real.",
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

export async function compareSnapshotsAction(snapshot1: string, snapshot2: string): Promise<ActionResult> {
  if (!isAutomationHostConfigured()) {
    return {
      ok: false,
      message: "No automation host connected yet. Set AUTOMATION_API_URL to compare live snapshots.",
    };
  }

  try {
    await automationClient.compareSnapshots({ snapshot1, snapshot2 });
    return { ok: true, message: "Comparison complete." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Comparison failed." };
  }
}
