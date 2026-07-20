import { automationClient, isAutomationHostConfigured } from "./automation-client";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import {
  mockComparison,
  mockConfig,
  mockHealth,
  mockLogs,
  mockReports,
  mockRuns,
  mockSnapshots,
  mockTasks,
} from "./mock-data";
import type {
  AutomationRun,
  AutomationTask,
  DataEnvelope,
  EnvironmentConfig,
  HealthStatus,
  LogEntry,
  ReportFile,
  SnapshotComparisonResult,
  SnapshotFile,
} from "./types";

function envelope<T>(data: T, source: "live" | "mock"): DataEnvelope<T> {
  return { data, source };
}

interface AutomationRunRow {
  id: string;
  route: string;
  status: "running" | "success" | "error";
  triggered_by: string;
  record_count: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

function mapRunRow(row: AutomationRunRow): AutomationRun {
  const startedMs = new Date(row.started_at).getTime();
  const finishedMs = row.finished_at ? new Date(row.finished_at).getTime() : null;

  return {
    id: row.id,
    taskId: row.route,
    taskLabel: row.route,
    route: row.route,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: finishedMs !== null ? finishedMs - startedMs : null,
    recordCount: row.record_count,
    formats: [],
    errorMessage: row.error_message,
  };
}

export async function getTasks(): Promise<DataEnvelope<AutomationTask[]>> {
  // Task definitions live in the codebase (src/commands/examples.js /
  // .github/workflows/automation.yml's route choices), not the data
  // store, so this is always the same list regardless of connection.
  return envelope(mockTasks, isSupabaseConfigured() || isAutomationHostConfigured() ? "live" : "mock");
}

export async function getRecentRuns(): Promise<DataEnvelope<AutomationRun[]>> {
  // Supabase (populated by the GitHub Actions workflow's ingest calls) is
  // the primary source now - checked first. AUTOMATION_API_URL (the
  // older always-on server model) is a fallback for anyone still running
  // src/server.js directly instead of GitHub Actions.
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("automation_runs")
        .select("id, route, status, triggered_by, record_count, error_message, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return envelope((data as AutomationRunRow[]).map(mapRunRow), "live");
    } catch {
      return envelope(mockRuns, "mock");
    }
  }

  if (!isAutomationHostConfigured()) {
    return envelope(mockRuns, "mock");
  }

  try {
    const status = await automationClient.getStatus();
    const last = status.lastResult as
      | { status: string; startTime: string; result?: { extracted?: { rowCount?: number } } }
      | null;

    if (!last) {
      return envelope([], "live");
    }

    const run: AutomationRun = {
      id: `run-${last.startTime}`,
      taskId: "unknown",
      taskLabel: "Last run",
      route: "unknown",
      status: last.status === "success" ? "success" : last.status === "running" ? "running" : "error",
      startedAt: last.startTime,
      finishedAt: last.status === "running" ? null : last.startTime,
      durationMs: null,
      recordCount: last.result?.extracted?.rowCount ?? null,
      formats: [],
      errorMessage: null,
    };

    return envelope([run], "live");
  } catch {
    return envelope(mockRuns, "mock");
  }
}

interface SuccessfulRunRow {
  id: string;
  route: string;
  record_count: number | null;
  started_at: string;
  finished_at: string | null;
}

export async function getReports(): Promise<DataEnvelope<ReportFile[]>> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("automation_runs")
        .select("id, route, record_count, started_at, finished_at")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Each successful run can be downloaded as either format, generated
      // on demand (see app/api/reports/download/route.ts) rather than
      // read from pre-generated files - there's nothing to read from disk
      // in a serverless deployment with no shared filesystem.
      const reports: ReportFile[] = (data as SuccessfulRunRow[]).flatMap((run) =>
        (["xlsx", "docx"] as const).map((format) => ({
          name: `${run.route}-${run.id}.${format}`,
          format,
          route: run.route,
          title: `${run.route} Export`,
          sizeBytes: 0, // Unknown until generated - not stored, generated fresh each download.
          generatedAt: run.finished_at ?? run.started_at,
          downloadPath: `/api/reports/download?runId=${run.id}&format=${format}`,
        }))
      );

      return envelope(reports, "live");
    } catch {
      return envelope(mockReports, "mock");
    }
  }

  if (!isAutomationHostConfigured()) {
    return envelope(mockReports, "mock");
  }

  try {
    const { exports: files } = await automationClient.getExports();
    const reports: ReportFile[] = files.map((file) => {
      const name = String(file.name ?? "");
      const format = name.endsWith(".docx") ? "docx" : "xlsx";
      return {
        name,
        format,
        route: "unknown",
        title: name,
        sizeBytes: Number(file.size ?? 0),
        generatedAt: new Date().toISOString(),
        downloadPath: String(file.path ?? ""),
      };
    });
    return envelope(reports, "live");
  } catch {
    return envelope(mockReports, "mock");
  }
}

export async function getSnapshots(): Promise<DataEnvelope<SnapshotFile[]>> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("automation_runs")
        .select("id, route, record_count, started_at, finished_at")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Every successful run *is* a snapshot now - there's no separate
      // snapshot file format, just the rows Supabase already has for
      // that run. Comparison (added/removed/modified) is computed on
      // demand between two runs' rows - see compareSnapshotsAction.
      const snapshots: SnapshotFile[] = (data as SuccessfulRunRow[]).map((run) => ({
        runId: run.id,
        fileName: `${run.route}-${(run.finished_at ?? run.started_at).replace(/[:.]/g, "-")}`,
        route: run.route,
        savedAt: run.finished_at ?? run.started_at,
        sizeBytes: 0,
        recordCount: run.record_count ?? 0,
        downloadPath: `/api/reports/download?runId=${run.id}&format=xlsx`,
      }));

      return envelope(snapshots, "live");
    } catch {
      return envelope(mockSnapshots, "mock");
    }
  }

  if (!isAutomationHostConfigured()) {
    return envelope(mockSnapshots, "mock");
  }

  try {
    const { snapshots } = await automationClient.getSnapshots();
    const files: SnapshotFile[] = snapshots.map((snap) => ({
      runId: String(snap.fileName ?? ""),
      fileName: String(snap.fileName ?? ""),
      route: "unknown",
      savedAt: String(snap.savedAt ?? ""),
      sizeBytes: Number(snap.size ?? 0),
      recordCount: 0,
      downloadPath: `/download/snapshot/${snap.fileName}`,
    }));
    return envelope(files, "live");
  } catch {
    return envelope(mockSnapshots, "mock");
  }
}

export async function getSnapshotComparison(): Promise<DataEnvelope<SnapshotComparisonResult | null>> {
  if (!isSupabaseConfigured() && !isAutomationHostConfigured()) {
    return envelope(mockComparison, "mock");
  }
  // Comparison is triggered on demand via the compareSnapshotsAction server action.
  return envelope(null, "live");
}

export async function getLogs(): Promise<DataEnvelope<LogEntry[]>> {
  if (!isAutomationHostConfigured()) {
    return envelope(mockLogs, "mock");
  }

  try {
    const { logs } = await automationClient.getLogs();
    const entries: LogEntry[] = logs.map((log) => ({
      timestamp: String(log.timestamp ?? new Date().toISOString()),
      level: (log.level as LogEntry["level"]) ?? "info",
      event: String(log.event ?? ""),
      message: log.message ? String(log.message) : undefined,
      meta: log.meta as Record<string, unknown> | undefined,
    }));
    return envelope(entries, "live");
  } catch {
    return envelope(mockLogs, "mock");
  }
}

export async function getHealth(): Promise<DataEnvelope<HealthStatus>> {
  if (!isAutomationHostConfigured()) {
    return envelope(mockHealth, "mock");
  }

  try {
    await automationClient.getHealth();
    const status = await automationClient.getStatus();
    return envelope(
      {
        application: "ok",
        browser: "ready",
        authentication: status.config.baseUrl ? "connected" : "not-configured",
        storageUsageBytes: mockHealth.storageUsageBytes,
        lastSuccessfulRun: mockHealth.lastSuccessfulRun,
        automationHostConfigured: true,
        automationHostUrl: process.env.AUTOMATION_API_URL ?? null,
      },
      "live"
    );
  } catch {
    return envelope(
      { ...mockHealth, application: "down", automationHostConfigured: true, automationHostUrl: process.env.AUTOMATION_API_URL ?? null },
      "live"
    );
  }
}

export async function getEnvironmentConfig(): Promise<DataEnvelope<EnvironmentConfig>> {
  if (!isAutomationHostConfigured()) {
    return envelope(mockConfig, "mock");
  }

  try {
    const status = await automationClient.getStatus();
    return envelope(
      { ...mockConfig, baseUrl: status.config.baseUrl, headless: status.config.headless, credentialsConfigured: true },
      "live"
    );
  } catch {
    return envelope(mockConfig, "mock");
  }
}
