"use client";

import { useMemo, useState } from "react";
import { Search, FileSpreadsheet, FileText, Download } from "lucide-react";
import { Card, CardHeader, EmptyState, Timestamp, formatBytes } from "@/components/ui/primitives";
import type { ReportFile } from "@/lib/types";

export function ReportsTable({ reports }: { reports: ReportFile[] }) {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<"all" | "xlsx" | "docx">("all");

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const matchesQuery = report.title.toLowerCase().includes(query.toLowerCase()) || report.route.toLowerCase().includes(query.toLowerCase());
      const matchesFormat = format === "all" || report.format === format;
      return matchesQuery && matchesFormat;
    });
  }, [reports, query, format]);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <CardHeader title="Generated reports" subtitle={`${filtered.length} of ${reports.length} reports`} />
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or route…"
              className="w-full rounded-lg border border-border bg-bg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          </div>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-soft"
          >
            <option value="all">All formats</option>
            <option value="xlsx">Excel</option>
            <option value="docx">Word</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No reports match" description="Try a different search term or clear the format filter." />
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((report) => (
            <div key={report.name} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                {report.format === "xlsx" ? (
                  <FileSpreadsheet size={17} className="text-success shrink-0" />
                ) : (
                  <FileText size={17} className="text-accent shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{report.title}</p>
                  <p className="text-xs text-ink-faint font-mono truncate">
                    {report.route} · {formatBytes(report.sizeBytes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Timestamp value={report.generatedAt} />
                <a
                  href={report.downloadPath}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-2 hover:text-accent-strong transition-colors"
                  aria-label={`Download ${report.name}`}
                >
                  <Download size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
