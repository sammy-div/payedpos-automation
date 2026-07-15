import { DataSourceBadge } from "@/components/ui/primitives";
import { ReportsTable } from "@/components/reports-table";
import { getReports } from "@/lib/data-source";

export const dynamic = "force-dynamic";


export default async function ReportsPage() {
  const reportsEnv = await getReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Browse, search, and download every export this platform has generated.</p>
        <DataSourceBadge source={reportsEnv.source} />
      </div>
      <ReportsTable reports={reportsEnv.data} />
    </div>
  );
}
