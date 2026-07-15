import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="font-display text-base font-semibold text-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "accent" | "success" | "amber" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  amber: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-ink-muted",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-mono tracking-tight ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** The persistent reminder that this platform never writes to PayedPOS. */
export function ReadOnlyBadge() {
  return (
    <Badge tone="amber">
      <span className="relative flex h-1.5 w-1.5">
        <span className="cursor-blink absolute inline-flex h-full w-full rounded-full bg-amber" />
      </span>
      READ-ONLY
    </Badge>
  );
}

export function LiveDot({ live = true }: { live?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {live && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${live ? "bg-success" : "bg-ink-faint"}`}
      />
    </span>
  );
}

export function DataSourceBadge({ source }: { source: "live" | "mock" }) {
  return source === "live" ? (
    <Badge tone="success">
      <LiveDot />
      LIVE
    </Badge>
  ) : (
    <Badge tone="neutral">DEMO DATA</Badge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-10 w-10 rounded-lg bg-surface-2 mb-4 flex items-center justify-center">
        <span className="font-mono text-ink-faint text-sm">∅</span>
      </div>
      <h3 className="font-display font-medium text-ink text-sm">{title}</h3>
      <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Timestamp({ value }: { value: string | null }) {
  if (!value) return <span className="font-mono text-ink-faint text-sm">—</span>;
  const date = new Date(value);
  return (
    <span className="font-mono text-sm text-ink-muted" title={date.toISOString()}>
      {date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
