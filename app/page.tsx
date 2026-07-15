import Link from "next/link";
import { ArrowRight, FileSpreadsheet, FileText as FileWordIcon, PlayCircle } from "lucide-react";
import { Card, CardHeader, DataSourceBadge, Timestamp, formatBytes } from "@/components/ui/primitives";
import { getEnvironmentConfig, getRecentRuns, getReports, getTasks } from "@/lib/data-source";
import type { AutomationRun } from "@/lib/types";

export const dynamic = "force-dynamic";


function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-2">{value}</p>
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </Card>
  );
}

function RunStatusDot({ status }: { status: AutomationRun["status"] }) {
  const color =
    status === "success"
      ? "bg-success"
      : status === "error"
        ? "bg-danger"
        : status === "running"
          ? "bg-accent"
          : "bg-ink-faint";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default async function DashboardPage() {
  const [tasksEnv, runsEnv, reportsEnv, configEnv] = await Promise.all([
    getTasks(),
    getRecentRuns(),
    getReports(),
    getEnvironmentConfig(),
  ]);

  const tasks = tasksEnv.data;
  const runs = runsEnv.data;
  const reports = reportsEnv.data;
  const lastRun = runs[0];
  const successCount = runs.filter((r) => r.status === "success").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Live read-only overview of {configEnv.data.baseUrl}
        </p>
        <DataSourceBadge source={runsEnv.source} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Automation tasks" value={String(tasks.length)} hint="Available to run" />
        <StatCard
          label="Last run"
          value={lastRun ? lastRun.status : "—"}
          hint={lastRun ? new Date(lastRun.startedAt).toLocaleString() : "No runs yet"}
        />
        <StatCard label="Success rate" value={runs.length ? `${Math.round((successCount / runs.length) * 100)}%` : "—"} hint={`${runs.length} recent runs`} />
        <StatCard label="Reports generated" value={String(reports.length)} hint="Excel + Word" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-5 pb-0">
            <CardHeader
              title="Recent activity"
              subtitle="Latest automation runs against PayedPOS"
              action={
                <Link href="/automations" className="text-xs font-medium text-accent-strong hover:underline flex items-center gap-1">
                  View all <ArrowRight size={13} />
                </Link>
              }
            />
          </div>
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <RunStatusDot status={run.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{run.taskLabel}</p>
                    <p className="text-xs text-ink-faint font-mono truncate">
                      {run.route} {run.recordCount !== null && `· ${run.recordCount.toLocaleString()} records`}
                    </p>
                  </div>
                </div>
                <Timestamp value={run.startedAt} />
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0">
            <CardHeader title="Quick actions" subtitle="Jump straight into a task" />
          </div>
          <div className="px-3 pb-3 space-y-1">
            {tasks.slice(0, 4).map((task) => (
              <Link
                key={task.id}
                href="/automations"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                  <PlayCircle size={15} className="text-accent-strong" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{task.label}</p>
                  <p className="text-xs text-ink-faint truncate">{task.route}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader
            title="Latest reports"
            subtitle="Most recently generated exports"
            action={
              <Link href="/reports" className="text-xs font-medium text-accent-strong hover:underline flex items-center gap-1">
                Browse all <ArrowRight size={13} />
              </Link>
            }
          />
        </div>
        <div className="divide-y divide-border">
          {reports.slice(0, 4).map((report) => (
            <div key={report.name} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                {report.format === "xlsx" ? (
                  <FileSpreadsheet size={16} className="text-success shrink-0" />
                ) : (
                  <FileWordIcon size={16} className="text-accent shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{report.title}</p>
                  <p className="text-xs text-ink-faint font-mono">{formatBytes(report.sizeBytes)}</p>
                </div>
              </div>
              <Timestamp value={report.generatedAt} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
