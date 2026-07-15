"use client";

import { useState, useTransition } from "react";
import { GitCompareArrows, Plus, Minus, Pencil, Loader2 } from "lucide-react";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { compareSnapshotsAction } from "@/lib/actions";
import type { SnapshotComparisonResult, SnapshotFile } from "@/lib/types";

export function SnapshotCompare({
  snapshots,
  initialComparison,
}: {
  snapshots: SnapshotFile[];
  initialComparison: SnapshotComparisonResult | null;
}) {
  const [before, setBefore] = useState(snapshots[1]?.fileName ?? "");
  const [after, setAfter] = useState(snapshots[0]?.fileName ?? "");
  const [comparison, setComparison] = useState<SnapshotComparisonResult | null>(initialComparison);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCompare = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await compareSnapshotsAction(before, after);
      setMessage(result.message);
      if (!result.ok) setComparison(null);
    });
  };

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <CardHeader title="Compare snapshots" subtitle="Detect additions, removals, and field-level changes" />
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent-soft"
          >
            {snapshots.map((s) => (
              <option key={s.fileName} value={s.fileName}>
                {s.fileName}
              </option>
            ))}
          </select>
          <GitCompareArrows size={16} className="text-ink-faint self-center hidden sm:block" />
          <select
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent-soft"
          >
            {snapshots.map((s) => (
              <option key={s.fileName} value={s.fileName}>
                {s.fileName}
              </option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-strong transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <GitCompareArrows size={14} />}
            Compare
          </button>
        </div>
        {message && <p className="text-xs text-amber -mt-2 mb-4">{message}</p>}
      </div>

      {!comparison ? (
        <EmptyState title="No comparison yet" description="Choose two snapshots above and run a comparison." />
      ) : (
        <div>
          <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
            <div className="px-5 py-3 text-center">
              <p className="font-display text-lg font-semibold text-success">+{comparison.totals.added}</p>
              <p className="text-xs text-ink-faint mt-0.5">Added</p>
            </div>
            <div className="px-5 py-3 text-center">
              <p className="font-display text-lg font-semibold text-danger">−{comparison.totals.removed}</p>
              <p className="text-xs text-ink-faint mt-0.5">Removed</p>
            </div>
            <div className="px-5 py-3 text-center">
              <p className="font-display text-lg font-semibold text-amber">{comparison.totals.modified}</p>
              <p className="text-xs text-ink-faint mt-0.5">Modified</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {comparison.added.map((row, i) => (
              <div key={`added-${i}`} className="flex items-center gap-3 px-5 py-2.5">
                <Plus size={14} className="text-success shrink-0" />
                <p className="text-sm font-mono text-ink-muted truncate">{JSON.stringify(row)}</p>
              </div>
            ))}
            {comparison.removed.map((row, i) => (
              <div key={`removed-${i}`} className="flex items-center gap-3 px-5 py-2.5">
                <Minus size={14} className="text-danger shrink-0" />
                <p className="text-sm font-mono text-ink-muted truncate">{JSON.stringify(row)}</p>
              </div>
            ))}
            {comparison.modified.map((entry) => (
              <div key={entry.key} className="flex items-center gap-3 px-5 py-2.5">
                <Pencil size={14} className="text-amber shrink-0" />
                <p className="text-sm text-ink-muted">
                  <span className="font-mono">{entry.key}</span>{" "}
                  {entry.changedFields.map((f) => (
                    <Badge key={f.field} tone="amber">
                      {f.field}: {f.before} → {f.after}
                    </Badge>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
