import { Card, CardHeader, DataSourceBadge, Timestamp } from "@/components/ui/primitives";
import { TaskCard } from "@/components/task-card";
import { getRecentRuns, getTasks } from "@/lib/data-source";

export const dynamic = "force-dynamic";


const statusTone: Record<string, string> = {
  success: "text-success",
  error: "text-danger",
  running: "text-accent",
  idle: "text-ink-faint",
};

export default async function AutomationsPage() {
  const [tasksEnv, runsEnv] = await Promise.all([getTasks(), getRecentRuns()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Every task below is strictly read-only — navigate, collect, analyze, export. Nothing here can create, edit, or delete PayedPOS records.
        </p>
        <DataSourceBadge source={tasksEnv.source} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {tasksEnv.data.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Execution history" subtitle="Most recent runs, newest first" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-y border-border">
                <th className="px-5 py-2.5 font-medium">Task</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Records</th>
                <th className="px-5 py-2.5 font-medium">Duration</th>
                <th className="px-5 py-2.5 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runsEnv.data.map((run) => (
                <tr key={run.id}>
                  <td className="px-5 py-3 font-medium text-ink">{run.taskLabel}</td>
                  <td className={`px-5 py-3 font-mono text-xs uppercase ${statusTone[run.status]}`}>{run.status}</td>
                  <td className="px-5 py-3 font-mono text-ink-muted">{run.recordCount?.toLocaleString() ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink-muted">
                    {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Timestamp value={run.startedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
