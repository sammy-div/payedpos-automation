import { Card, CardHeader, DataSourceBadge, Timestamp, formatBytes } from "@/components/ui/primitives";
import { SnapshotCompare } from "@/components/snapshot-compare";
import { getSnapshotComparison, getSnapshots } from "@/lib/data-source";

export const dynamic = "force-dynamic";


export default async function SnapshotsPage() {
  const [snapshotsEnv, comparisonEnv] = await Promise.all([getSnapshots(), getSnapshotComparison()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Timestamped snapshots saved after every successful extraction, for historical comparison only — never a substitute for live data.</p>
        <DataSourceBadge source={snapshotsEnv.source} />
      </div>

      <SnapshotCompare snapshots={snapshotsEnv.data} initialComparison={comparisonEnv.data} />

      <Card padded={false}>
        <div className="p-5 pb-0">
          <CardHeader title="Snapshot history" subtitle={`${snapshotsEnv.data.length} snapshots stored`} />
        </div>
        <div className="divide-y divide-border">
          {snapshotsEnv.data.map((snap) => (
            <div key={snap.fileName} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-mono text-ink truncate">{snap.fileName}</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {snap.route} · {snap.recordCount.toLocaleString()} records · {formatBytes(snap.sizeBytes)}
                </p>
              </div>
              <Timestamp value={snap.savedAt} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
