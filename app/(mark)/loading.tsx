export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-36 rounded-lg bg-surface-soft" />
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-surface-soft" />
          <div className="size-8 rounded-full bg-surface-soft" />
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        <div className="h-28 rounded-2xl border border-border bg-surface" />
        <div className="h-28 rounded-2xl border border-border bg-surface" />
        <div className="h-28 rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
}
