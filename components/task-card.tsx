"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PlayCircle, Loader2, Search } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { runExportAction, runSearchAction } from "@/lib/actions";
import type { AutomationStatusPayload, AutomationTask } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

type RunPhase = "idle" | "starting" | "running" | "success" | "error";

function useStatusPolling() {
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => stop, []);

  const startPolling = () => {
    stop();
    setPhase("running");
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const status: AutomationStatusPayload & { hostConfigured?: boolean } = await res.json();

        if (!status.lastResult || status.running) {
          return;
        }

        stop();
        if (status.lastResult.status === "success") {
          setPhase("success");
          setMessage("Completed successfully.");
        } else {
          setPhase("error");
          setMessage(status.lastResult.error ?? "Run failed.");
        }
      } catch {
        // Transient network hiccup while polling - keep trying on the next tick.
      }
    }, POLL_INTERVAL_MS);
  };

  return { phase, message, setPhase, setMessage, startPolling };
}

export function TaskCard({ task }: { task: AutomationTask }) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const { phase, message, setPhase, setMessage, startPolling } = useStatusPolling();

  const isExport = task.action === "read:full-export";
  const isSearch = task.action === "read:search";
  const supported = isExport || isSearch;

  const handleRun = () => {
    setMessage(null);
    setPhase("starting");
    startTransition(async () => {
      const outcome = isExport
        ? await runExportAction(task.route, task.defaultFormats ?? [])
        : await runSearchAction(task.route, query);

      if (!outcome.ok) {
        setPhase("error");
        setMessage(outcome.message);
        return;
      }

      setMessage(outcome.message);
      startPolling();
    });
  };

  const busy = isPending || phase === "starting" || phase === "running";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ink">{task.label}</p>
          <p className="text-xs text-ink-muted mt-1">{task.description}</p>
        </div>
        <Badge tone="neutral">{task.route}</Badge>
      </div>

      {isExport && (
        <div className="flex items-center gap-2 mt-4">
          {task.defaultFormats?.map((format) => (
            <span key={format} className="text-[11px] font-mono text-ink-faint uppercase">
              {format}
            </span>
          ))}
        </div>
      )}

      {isSearch && (
        <div className="relative mt-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query…"
            className="w-full rounded-lg border border-border bg-bg pl-8 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={busy || !supported || (isSearch && query.trim().length === 0)}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent-strong transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
        {phase === "starting" ? "Starting…" : phase === "running" ? "Running…" : "Run"}
      </button>

      {!supported && (
        <p className="text-xs mt-2.5 text-ink-faint">This action isn&apos;t wired up in the dashboard yet.</p>
      )}

      {message && (
        <p className={`text-xs mt-2.5 ${phase === "error" ? "text-amber" : "text-success"}`}>{message}</p>
      )}
    </Card>
  );
}
