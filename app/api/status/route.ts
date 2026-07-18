import { NextResponse } from "next/server";
import { automationClient, isAutomationHostConfigured } from "@/lib/automation-client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const route = new URL(request.url).searchParams.get("route");

  if (isSupabaseConfigured() && route) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("automation_runs")
        .select("status, route, record_count, error_message, started_at, finished_at")
        .eq("route", route)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return NextResponse.json({ running: false, lastResult: null, config: null, hostConfigured: true });
      }

      return NextResponse.json({
        running: data.status === "running",
        lastResult: {
          status: data.status,
          route: data.route,
          startTime: data.started_at,
          error: data.error_message,
          result: { extracted: { rowCount: data.record_count } },
        },
        config: null,
        hostConfigured: true,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to reach Supabase", hostConfigured: true },
        { status: 502 }
      );
    }
  }

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
