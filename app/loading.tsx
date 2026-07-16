export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-64 rounded bg-surface-2" />
        <div className="h-6 w-20 rounded-full bg-surface-2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="h-7 w-16 rounded bg-surface-2 mt-3" />
            <div className="h-3 w-24 rounded bg-surface-2 mt-2" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-surface-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
