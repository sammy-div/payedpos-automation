import { automationClient, isAutomationHostConfigured } from "./automation-client";
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

export async function getTasks(): Promise<DataEnvelope<AutomationTask[]>> {
  // Task definitions live in the codebase (commands/examples.js), not the
  // live host, so this is always the same list regardless of connection.
  return envelope(mockTasks, isAutomationHostConfigured() ? "live" : "mock");
}

export async function getRecentRuns(): Promise<DataEnvelope<AutomationRun[]>> {
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

export async function getReports(): Promise<DataEnvelope<ReportFile[]>> {
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
  if (!isAutomationHostConfigured()) {
    return envelope(mockSnapshots, "mock");
  }

  try {
    const { snapshots } = await automationClient.getSnapshots();
    const files: SnapshotFile[] = snapshots.map((snap) => ({
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
  if (!isAutomationHostConfigured()) {
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
