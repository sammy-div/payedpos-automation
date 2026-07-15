import { Card, CardHeader, DataSourceBadge, Badge } from "@/components/ui/primitives";
import { getEnvironmentConfig } from "@/lib/data-source";
import { isAutomationHostConfigured } from "@/lib/automation-client";

export const dynamic = "force-dynamic";


function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-mono text-ink">{value}</span>
    </div>
  );
}

export default async function ConfigurationPage() {
  const configEnv = await getEnvironmentConfig();
  const config = configEnv.data;
  const hostConfigured = isAutomationHostConfigured();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Current environment configuration. This page is informational only — credentials and connection settings are managed via environment variables, never entered or stored in the browser.</p>
        <DataSourceBadge source={configEnv.source} />
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader
            title="Automation host"
            subtitle="The always-on server that actually runs Playwright"
            action={<Badge tone={hostConfigured ? "success" : "amber"}>{hostConfigured ? "CONNECTED" : "NOT CONNECTED"}</Badge>}
          />
        </div>
        <div className="divide-y divide-border">
          <ConfigRow label="AUTOMATION_API_URL" value={hostConfigured ? "configured" : "not set"} />
        </div>
        {!hostConfigured && (
          <div className="mx-5 mb-5 mt-2 rounded-lg bg-amber-soft px-4 py-3 text-xs text-amber leading-relaxed">
            This dashboard is currently showing demo data. Deploy <code className="font-mono">src/server.js</code> to an always-on
            host (Railway, Fly.io, a small VPS, etc.), then set <code className="font-mono">AUTOMATION_API_URL</code> in this
            project&apos;s Vercel environment variables to point here — no code changes needed.
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Target application" subtitle="Where the automation navigates and reads data" />
        </div>
        <div className="divide-y divide-border">
          <ConfigRow label="Base URL" value={config.baseUrl} />
          <ConfigRow label="Headless mode" value={config.headless ? "enabled" : "disabled"} />
          <ConfigRow label="Request timeout" value={`${config.timeoutMs / 1000}s`} />
          <ConfigRow label="Max retries" value={String(config.maxRetries)} />
          <ConfigRow label="Viewport" value={`${config.viewport.width} × ${config.viewport.height}`} />
          <ConfigRow label="Credentials" value={config.credentialsConfigured ? "configured" : "not set"} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Storage paths" subtitle="Where output is written on the automation host" />
        </div>
        <div className="divide-y divide-border">
          <ConfigRow label="Reports" value={`/${config.outputDir}`} />
          <ConfigRow label="Snapshots" value={`/${config.snapshotDir}`} />
          <ConfigRow label="Logs" value={`/${config.logDir}`} />
        </div>
      </Card>
    </div>
  );
}
