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
    await automationClient.runExport({ route, formats });
    return { ok: true, message: `Export started for "${route}".` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Export failed." };
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
