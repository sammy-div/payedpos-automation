"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-12 w-12 rounded-xl bg-danger-soft flex items-center justify-center mb-4">
        <AlertTriangle size={20} className="text-danger" />
      </div>
      <h2 className="font-display font-semibold text-ink">Something went wrong</h2>
      <p className="text-sm text-ink-muted mt-1.5 max-w-sm">
        This page ran into an unexpected error. Your data is unaffected — this platform never writes to PayedPOS.
      </p>
      {error.digest && <p className="text-xs font-mono text-ink-faint mt-2">Reference: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-5 flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-strong transition-colors"
      >
        <RotateCw size={14} />
        Try again
      </button>
    </div>
  );
}
