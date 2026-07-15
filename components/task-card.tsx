"use client";

import { useState, useTransition } from "react";
import { PlayCircle, Loader2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { runExportAction } from "@/lib/actions";
import type { AutomationTask } from "@/lib/types";

export function TaskCard({ task }: { task: AutomationTask }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleRun = () => {
    setResult(null);
    startTransition(async () => {
      const outcome = await runExportAction(task.route, task.defaultFormats ?? []);
      setResult(outcome);
    });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ink">{task.label}</p>
          <p className="text-xs text-ink-muted mt-1">{task.description}</p>
        </div>
        <Badge tone="neutral">{task.route}</Badge>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {task.defaultFormats?.map((format) => (
          <span key={format} className="text-[11px] font-mono text-ink-faint uppercase">
            {format}
          </span>
        ))}
      </div>

      <button
        onClick={handleRun}
        disabled={isPending}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent-strong transition-colors disabled:opacity-60"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
        {isPending ? "Running…" : "Run"}
      </button>

      {result && (
        <p className={`text-xs mt-2.5 ${result.ok ? "text-success" : "text-amber"}`}>{result.message}</p>
      )}
    </Card>
  );
}
