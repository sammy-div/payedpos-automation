export type RunStatus = "idle" | "running" | "success" | "error";

export interface AutomationTask {
  id: string;
  route: string;
  label: string;
  description: string;
  action:
    | "read:full-export"
    | "read:search"
    | "read:analyze"
    | "read:compare-snapshots";
  defaultFormats?: Array<"excel" | "word" | "snapshot">;
}

export interface AutomationRun {
  id: string;
  taskId: string;
  taskLabel: string;
  route: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  recordCount: number | null;
  formats: Array<"excel" | "word" | "snapshot">;
  errorMessage: string | null;
}

export interface ReportFile {
  name: string;
  format: "xlsx" | "docx";
  route: string;
  title: string;
  sizeBytes: number;
  generatedAt: string;
  downloadPath: string;
}

export interface SnapshotFile {
  fileName: string;
  route: string;
  savedAt: string;
  sizeBytes: number;
  recordCount: number;
  downloadPath: string;
}

export interface SnapshotComparisonResult {
  keyField: string | null;
  totals: {
    before: number;
    after: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  added: Record<string, string>[];
  removed: Record<string, string>[];
  modified: Array<{
    key: string;
    changedFields: Array<{ field: string; before: string | null; after: string | null }>;
  }>;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface HealthStatus {
  application: "ok" | "degraded" | "down";
  browser: "ready" | "not-configured" | "unknown";
  authentication: "connected" | "not-configured" | "expired" | "unknown";
  storageUsageBytes: number;
  lastSuccessfulRun: string | null;
  automationHostConfigured: boolean;
  automationHostUrl: string | null;
}

export interface EnvironmentConfig {
  baseUrl: string;
  headless: boolean;
  timeoutMs: number;
  maxRetries: number;
  viewport: { width: number; height: number };
  outputDir: string;
  snapshotDir: string;
  logDir: string;
  credentialsConfigured: boolean;
}

export interface AutomationStatusPayload {
  running: boolean;
  lastResult: {
    status: "running" | "success" | "error";
    operation?: "export" | "search" | "analyze";
    route?: string;
    startTime: string;
    finishedAt?: string;
    error?: string;
    result?: unknown;
  } | null;
  config: { baseUrl: string; headless: boolean };
}

/** True when this data came from a live automation host rather than mock/demo data. */
export interface DataEnvelope<T> {
  data: T;
  source: "live" | "mock";
}
