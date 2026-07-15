import { NextResponse } from "next/server";
import { automationClient, isAutomationHostConfigured } from "@/lib/automation-client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAutomationHostConfigured()) {
    return NextResponse.json({ running: false, lastResult: null, config: null, hostConfigured: false });
  }

  try {
    const status = await automationClient.getStatus();
    return NextResponse.json({ ...status, hostConfigured: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach automation host", hostConfigured: true },
      { status: 502 }
    );
  }
}
