"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlayCircle,
  FileText,
  GitCompareArrows,
  Terminal,
  Settings,
  HeartPulse,
  Moon,
  Sun,
} from "lucide-react";
import { ReadOnlyBadge } from "./ui/primitives";
import { useTheme } from "./theme-provider";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/automations", label: "Automations", icon: PlayCircle },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/snapshots", label: "Snapshots", icon: GitCompareArrows },
  { href: "/logs", label: "Logs", icon: Terminal },
  { href: "/configuration", label: "Configuration", icon: Settings },
  { href: "/health", label: "Health", icon: HeartPulse },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const currentLabel = NAV_ITEMS.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-surface">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
            <span className="font-mono text-xs font-medium text-white">P</span>
          </div>
          <span className="font-display font-semibold text-ink tracking-tight text-sm">PayedPOS Ops</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-accent-strong"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <ReadOnlyBadge />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 shrink-0 border-b border-border bg-surface flex items-center justify-between px-4 md:px-6">
          <h1 className="font-display font-semibold text-ink text-base">{currentLabel}</h1>
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <ReadOnlyBadge />
            </div>
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-border bg-surface flex items-stretch z-10">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-accent-strong" : "text-ink-muted"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
