import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-12 w-12 rounded-xl bg-surface-2 flex items-center justify-center mb-4">
        <Compass size={20} className="text-ink-faint" />
      </div>
      <h2 className="font-display font-semibold text-ink">Page not found</h2>
      <p className="text-sm text-ink-muted mt-1.5 max-w-sm">
        This route doesn&apos;t exist in the operations dashboard.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-strong transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
