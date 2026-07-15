/**
 * Client for the always-on Playwright automation server (src/server.js),
 * deployed separately from this Next.js app (Railway/Docker/etc.) since
 * Vercel functions aren't a good fit for a persistent headless browser.
 *
 * Set AUTOMATION_API_URL to point this dashboard at a real host. Until
 * then, lib/data-source.ts falls back to mock data automatically.
 */

function getAutomationHostUrl(): string | null {
  const url = process.env.AUTOMATION_API_URL;
  return url && url.trim().length > 0 ? url.replace(/\/$/, "") : null;
}

export function isAutomationHostConfigured(): boolean {
  return getAutomationHostUrl() !== null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getAutomationHostUrl();
  if (!baseUrl) {
    throw new Error("AUTOMATION_API_URL is not configured");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Automation host request failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const automationClient = {
  getHealth: () => request<{ status: string; timestamp: string }>("/health"),
  getStatus: () =>
    request<{ running: boolean; lastResult: unknown; config: { baseUrl: string; headless: boolean } }>(
      "/api/status"
    ),
  getSnapshots: () => request<{ snapshots: Array<Record<string, unknown>> }>("/api/snapshots"),
  getExports: () => request<{ exports: Array<Record<string, unknown>> }>("/api/exports"),
  getLogs: () => request<{ logs: Array<Record<string, unknown>> }>("/api/logs"),
  runExport: (body: { route: string; formats: Array<"excel" | "word" | "snapshot"> }) =>
    request("/api/export", { method: "POST", body: JSON.stringify(body) }),
  runSearch: (body: { route: string; query: string }) =>
    request("/api/search", { method: "POST", body: JSON.stringify(body) }),
  runAnalyze: (body: { route: string; operation: string; field: string }) =>
    request("/api/analyze", { method: "POST", body: JSON.stringify(body) }),
  compareSnapshots: (body: { snapshot1: string; snapshot2: string }) =>
    request("/api/compare-snapshots", { method: "POST", body: JSON.stringify(body) }),
};
