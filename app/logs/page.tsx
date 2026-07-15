import { DataSourceBadge } from "@/components/ui/primitives";
import { LogViewer } from "@/components/log-viewer";
import { getLogs } from "@/lib/data-source";

export const dynamic = "force-dynamic";


export default async function LogsPage() {
  const logsEnv = await getLogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Structured logs for authentication, navigation, pagination, extraction, reporting, and errors.</p>
        <DataSourceBadge source={logsEnv.source} />
      </div>
      <LogViewer logs={logsEnv.data} />
    </div>
  );
}
