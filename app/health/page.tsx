import { Card, CardHeader, DataSourceBadge, Badge, Timestamp, formatBytes, LiveDot } from "@/components/ui/primitives";
import { getHealth } from "@/lib/data-source";

export const dynamic = "force-dynamic";


const statusTone = {
  ok: "success",
  ready: "success",
  connected: "success",
  degraded: "amber",
  expired: "amber",
  "not-configured": "neutral",
  unknown: "neutral",
  down: "danger",
} as const;

function StatusCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: keyof typeof statusTone;
  detail: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{title}</p>
        <LiveDot live={status === "ok" || status === "ready" || status === "connected"} />
      </div>
      <div className="mt-3">
        <Badge tone={statusTone[status]}>{status.replace("-", " ").toUpperCase()}</Badge>
      </div>
      <p className="text-xs text-ink-faint mt-2.5">{detail}</p>
    </Card>
  );
}

export default async function HealthPage() {
  const healthEnv = await getHealth();
  const health = healthEnv.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Live status of every component this platform depends on.</p>
        <DataSourceBadge source={healthEnv.source} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Application" status={health.application} detail="This Next.js dashboard" />
        <StatusCard
          title="Browser"
          status={health.browser}
          detail={health.browser === "ready" ? "Playwright/Chromium ready" : "No live automation host connected"}
        />
        <StatusCard
          title="Authentication"
          status={health.authentication}
          detail={health.authentication === "connected" ? "Session active" : "No active session"}
        />
        <Card>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Storage used</p>
          <p className="font-display text-2xl font-semibold text-ink mt-3">{formatBytes(health.storageUsageBytes)}</p>
          <p className="text-xs text-ink-faint mt-2.5">Reports, snapshots &amp; logs combined</p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Last successful run" subtitle="Most recent completed automation" />
        </div>
        <div className="px-5 pb-5">
          <Timestamp value={health.lastSuccessfulRun} />
        </div>
      </Card>
    </div>
  );
}
