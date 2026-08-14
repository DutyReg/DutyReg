export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-44 rounded-lg bg-surface-soft" />
      <div className="mt-4 h-64 rounded-2xl border border-border bg-surface" />
    </div>
  );
}
