import { BrandLockup } from "@/components/brand";
import { Card } from "@/components/ui";

export function ConfigNeeded() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="grid w-full max-w-md gap-4 px-6 py-8">
        <BrandLockup />
        <div className="grid gap-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            DutyReg needs setup
          </h1>
          <p className="text-sm text-muted">
            Supabase credentials are not configured yet. Copy <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">.env.example</code>{" "}
            to <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">.env.local</code>{" "}
            and add your Supabase project URL and anon key, then restart the app.
          </p>
        </div>
      </Card>
    </main>
  );
}