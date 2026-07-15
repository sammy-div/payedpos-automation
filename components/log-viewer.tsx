"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import type { LogEntry, LogLevel } from "@/lib/types";

const levelColor: Record<LogLevel, string> = {
  info: "text-ink-muted",
  warn: "text-amber",
  error: "text-danger",
};

export function LogViewer({ logs }: { logs: LogEntry[] }) {
  const [level, setLevel] = useState<"all" | LogLevel>("all");

  const filtered = useMemo(() => logs.filter((log) => level === "all" || log.level === level), [logs, level]);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <CardHeader
          title="Execution logs"
          subtitle={`${filtered.length} of ${logs.length} entries`}
          action={
            <div className="flex gap-1">
              {(["all", "info", "warn", "error"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setLevel(option)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase transition-colors ${
                    level === option ? "bg-accent-soft text-accent-strong" : "text-ink-faint hover:bg-surface-2"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No log entries" description="Nothing matches this filter yet." />
      ) : (
        <div className="bg-surface-2 font-mono text-xs overflow-x-auto">
          {filtered.map((log, i) => (
            <div key={i} className="px-5 py-2 border-b border-border last:border-0 whitespace-pre">
              <span className="text-ink-faint">{new Date(log.timestamp).toISOString()}</span>{" "}
              <span className={`uppercase font-medium ${levelColor[log.level]}`}>[{log.level}]</span>{" "}
              <span className="text-ink">{log.event}</span>
              {log.message && <span className="text-ink-muted"> — {log.message}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
