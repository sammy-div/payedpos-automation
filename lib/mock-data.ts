import type {
  AutomationRun,
  AutomationTask,
  EnvironmentConfig,
  HealthStatus,
  LogEntry,
  ReportFile,
  SnapshotComparisonResult,
  SnapshotFile,
} from "./types";

// Routes below match src/browser/navigation/router.js exactly - these are
// the only routes actually confirmed against the real PayedPOS site.
export const mockTasks: AutomationTask[] = [
  {
    id: "dashboard-export",
    route: "dashboard",
    label: "Dashboard export",
    description: "Full read-only export of the PayedPOS dashboard overview.",
    action: "read:full-export",
    defaultFormats: ["excel", "snapshot"],
  },
  {
    id: "terminals-export",
    route: "pos-terminals-assigned",
    label: "Assigned POS terminals export",
    description: "Extract every assigned terminal record, paginated automatically.",
    action: "read:full-export",
    defaultFormats: ["excel", "word", "snapshot"],
  },
  {
    id: "transactions-export",
    route: "transactions",
    label: "Transactions export",
    description: "Extract transaction records with applied filters, if any.",
    action: "read:full-export",
    defaultFormats: ["excel", "snapshot"],
  },
  {
    id: "locations-search",
    route: "locations",
    label: "Search locations",
    description: "Search the locations list by any auto-detected field.",
    action: "read:search",
  },
];

export const mockRuns: AutomationRun[] = [
  {
    id: "run-1042",
    taskId: "terminals-export",
    taskLabel: "Assigned POS terminals export",
    route: "pos-terminals-assigned",
    status: "success",
    startedAt: "2026-07-15T08:12:04.000Z",
    finishedAt: "2026-07-15T08:13:41.000Z",
    durationMs: 97000,
    recordCount: 1284,
    formats: ["excel", "snapshot"],
    errorMessage: null,
  },
  {
    id: "run-1041",
    taskId: "dashboard-export",
    taskLabel: "Dashboard export",
    route: "dashboard",
    status: "success",
    startedAt: "2026-07-15T06:00:11.000Z",
    finishedAt: "2026-07-15T06:01:02.000Z",
    durationMs: 51000,
    recordCount: 342,
    formats: ["excel", "word", "snapshot"],
    errorMessage: null,
  },
  {
    id: "run-1040",
    taskId: "transactions-export",
    taskLabel: "Transactions export",
    route: "transactions",
    status: "error",
    startedAt: "2026-07-14T22:40:00.000Z",
    finishedAt: "2026-07-14T22:40:18.000Z",
    durationMs: 18000,
    recordCount: null,
    formats: ["excel"],
    errorMessage: "Timed out waiting for authenticated session.",
  },
  {
    id: "run-1039",
    taskId: "locations-search",
    taskLabel: "Search locations",
    route: "locations",
    status: "success",
    startedAt: "2026-07-14T19:17:24.000Z",
    finishedAt: "2026-07-14T19:17:52.000Z",
    durationMs: 28000,
    recordCount: 47,
    formats: [],
    errorMessage: null,
  },
];

export const mockReports: ReportFile[] = [
  {
    name: "report-2026-07-15T08-13-41-000Z.xlsx",
    format: "xlsx",
    route: "pos-terminals-assigned",
    title: "Assigned POS Terminals Export",
    sizeBytes: 184_320,
    generatedAt: "2026-07-15T08:13:41.000Z",
    downloadPath: "/download/export/report-2026-07-15T08-13-41-000Z.xlsx",
  },
  {
    name: "report-2026-07-15T06-01-02-000Z.docx",
    format: "docx",
    route: "dashboard",
    title: "Dashboard Export",
    sizeBytes: 98_112,
    generatedAt: "2026-07-15T06:01:02.000Z",
    downloadPath: "/download/export/report-2026-07-15T06-01-02-000Z.docx",
  },
  {
    name: "report-2026-07-15T06-01-02-000Z.xlsx",
    format: "xlsx",
    route: "dashboard",
    title: "Dashboard Export",
    sizeBytes: 61_204,
    generatedAt: "2026-07-15T06:01:02.000Z",
    downloadPath: "/download/export/report-2026-07-15T06-01-02-000Z.xlsx",
  },
  {
    name: "report-2026-07-14T19-17-52-000Z.xlsx",
    format: "xlsx",
    route: "locations",
    title: "Locations Search",
    sizeBytes: 22_050,
    generatedAt: "2026-07-14T19:17:52.000Z",
    downloadPath: "/download/export/report-2026-07-14T19-17-52-000Z.xlsx",
  },
];

export const mockSnapshots: SnapshotFile[] = [
  {
    fileName: "snapshot-2026-07-15T08-13-41-000Z.json",
    route: "pos-terminals-assigned",
    savedAt: "2026-07-15T08:13:41.000Z",
    sizeBytes: 412_004,
    recordCount: 1284,
    downloadPath: "/download/snapshot/snapshot-2026-07-15T08-13-41-000Z.json",
  },
  {
    fileName: "snapshot-2026-07-14T08-09-12-000Z.json",
    route: "pos-terminals-assigned",
    savedAt: "2026-07-14T08:09:12.000Z",
    sizeBytes: 405_812,
    recordCount: 1266,
    downloadPath: "/download/snapshot/snapshot-2026-07-14T08-09-12-000Z.json",
  },
  {
    fileName: "snapshot-2026-07-15T06-01-02-000Z.json",
    route: "dashboard",
    savedAt: "2026-07-15T06:01:02.000Z",
    sizeBytes: 88_442,
    recordCount: 342,
    downloadPath: "/download/snapshot/snapshot-2026-07-15T06-01-02-000Z.json",
  },
];

export const mockComparison: SnapshotComparisonResult = {
  keyField: "Terminal ID",
  totals: { before: 1266, after: 1284, added: 21, removed: 3, modified: 8, unchanged: 1255 },
  added: [
    { "Terminal ID": "TID-88291", Status: "Active", Location: "Coral Coffee Co." },
    { "Terminal ID": "TID-88292", Status: "Active", Location: "Coral Coffee Co." },
  ],
  removed: [{ "Terminal ID": "TID-77410", Status: "Retired", Location: "Northgate Deli" }],
  modified: [
    {
      key: "TID-45021",
      changedFields: [{ field: "Status", before: "Unassigned", after: "Active" }],
    },
    {
      key: "TID-45188",
      changedFields: [{ field: "Location", before: "Blue Wave Retail", after: "Blue Wave Retail Group" }],
    },
  ],
};

export const mockLogs: LogEntry[] = [
  { timestamp: "2026-07-15T08:13:41.000Z", level: "info", event: "server.export.success", message: "route=pos-terminals-assigned formats=excel,snapshot" },
  { timestamp: "2026-07-15T08:13:40.500Z", level: "info", event: "report.excel", message: "outputPath=/output/report-2026-07-15T08-13-41-000Z.xlsx totalRows=1284" },
  { timestamp: "2026-07-15T08:12:41.100Z", level: "info", event: "pagination.complete", message: "totalRows=1284" },
  { timestamp: "2026-07-15T08:12:05.200Z", level: "info", event: "security.action.allowed", message: 'actionName="read:full-export"' },
  { timestamp: "2026-07-15T08:12:04.800Z", level: "info", event: "auth.reuse", message: "storagePath=storage/auth-state.json" },
  { timestamp: "2026-07-14T22:40:18.000Z", level: "error", event: "server.export.error", message: "Timed out waiting for authenticated session." },
  { timestamp: "2026-07-14T22:40:00.100Z", level: "warn", event: "auth.session.expired", message: "Session refresh is scaffolded; implement actual detection logic when the site is available." },
  { timestamp: "2026-07-14T19:17:52.000Z", level: "info", event: "server.search.success", message: 'query="coral"' },
];

export const mockHealth: HealthStatus = {
  application: "ok",
  browser: "not-configured",
  authentication: "not-configured",
  storageUsageBytes: 812_408,
  lastSuccessfulRun: "2026-07-15T08:13:41.000Z",
  automationHostConfigured: false,
  automationHostUrl: null,
};

export const mockConfig: EnvironmentConfig = {
  baseUrl: "https://payedpos.vercel.app",
  headless: true,
  timeoutMs: 30000,
  maxRetries: 2,
  viewport: { width: 1440, height: 900 },
  outputDir: "output",
  snapshotDir: "snapshots",
  logDir: "logs",
  credentialsConfigured: false,
};
