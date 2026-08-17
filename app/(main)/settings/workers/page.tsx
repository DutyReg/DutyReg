import { redirect } from "next/navigation";

import { addWorker, deleteWorker, updateWorker } from "@/app/actions/workers";
import { ActionForm } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { Card, Chip, EmptyState, Field, Input, SectionTitle, Select } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Site, Worker } from "@/lib/types";

export const metadata = { title: "Workers" };

export default async function WorkersPage() {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");

  const supabase = await createClient();
  const [workersResult, sitesResult] = await Promise.all([
    supabase
      .from("workers")
      .select("*")
      .eq("company_id", ctx.company.id)
      .order("name")
      .returns<Worker[]>(),
    supabase
      .from("sites")
      .select("*")
      .eq("company_id", ctx.company.id)
      .order("name")
      .returns<Site[]>(),
  ]);

  const workers = workersResult.data ?? [];
  const sites = sitesResult.data ?? [];

  return (
    <div className="grid gap-5">
      <RealtimeRefresher tables={[{ table: "workers", companyId: ctx.company.id }]} />
      <Card className="grid gap-4 px-5 py-6">
        <div className="grid gap-1">
          <SectionTitle>Add a worker</SectionTitle>
          <p className="text-sm text-muted">
            Workers appear on the attendance screen. The worker code is optional.
          </p>
        </div>
        <ActionForm action={addWorker}>
          <Field label="Full name">
            <Input name="name" required minLength={2} maxLength={160} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Worker code (optional)" hint="e.g. W014">
              <Input name="workerCode" maxLength={20} />
            </Field>
            <Field label="Site (optional)">
              <Select name="siteId" defaultValue="">
                <option value="">Not assigned</option>
                {sites.filter((s) => s.active).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </ActionForm>
      </Card>

      {workers.length === 0 ? (
        <EmptyState
          title="No workers yet"
          body="Add your worker list. Supervisors will mark them present or absent each day."
        />
      ) : (
        <div className="grid gap-3">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} sites={sites} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkerCard({ worker, sites }: { worker: Worker; sites: Site[] }) {
  const siteLabel = sites.find((s) => s.id === worker.site_id)?.name ?? "Not assigned";

  return (
    <Card className="grid gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate text-[15px] font-semibold text-ink">{worker.name}</p>
          <p className="text-xs text-muted">
            <span className="font-mono">{worker.worker_code ?? "—"}</span> · {siteLabel}
          </p>
        </div>
        {worker.active ? <Chip tone="positive">Active</Chip> : <Chip tone="neutral">Inactive</Chip>}
      </div>

      <ActionForm
        action={updateWorker}
        resetKey={`${worker.id}-${worker.name}-${worker.active}`}
        submitLabel="Save changes"
        className="gap-2"
      >
        <input type="hidden" name="id" value={worker.id} />
        <Field label="Full name">
          <Input name="name" defaultValue={worker.name} required minLength={2} maxLength={160} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Worker code">
            <Input name="workerCode" defaultValue={worker.worker_code ?? ""} maxLength={20} />
          </Field>
          <Field label="Site">
            <Select name="siteId" defaultValue={worker.site_id ?? ""}>
              <option value="">Not assigned</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </ActionForm>

      <div className="pt-1">
        <ConfirmDialog
          label="Delete worker"
          title="Delete this worker?"
          message="This permanently deletes the worker and their attendance records. This cannot be undone."
          action={deleteWorker}
          hiddenFields={{ id: worker.id }}
        />
      </div>
    </Card>
  );
}