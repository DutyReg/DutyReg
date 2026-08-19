import { redirect } from "next/navigation";

import { addSite, deleteSite, renameSite } from "@/app/actions/sites";
import { ActionForm } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { Card, Chip, EmptyState, Field, Input, SectionTitle } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Site } from "@/lib/types";

export const metadata = { title: "Sites" };

export default async function SitesPage() {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");

  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("company_id", ctx.company.id)
    .order("created_at")
    .returns<Site[]>();

  const siteList = sites ?? [];

  return (
    <div className="grid gap-5">
      <RealtimeRefresher tables={[{ table: "sites", companyId: ctx.company.id }]} />
      <Card className="grid gap-4 px-5 py-6">
        <div className="grid gap-1">
          <SectionTitle>Add a site</SectionTitle>
          <p className="text-sm text-muted">A site is where attendance is marked — e.g. a branch or a client location.</p>
        </div>
        <ActionForm action={addSite}>
          <Field label="Site name">
            <Input name="name" required minLength={2} maxLength={120} placeholder="e.g. Colombo Main Site" />
          </Field>
        </ActionForm>
      </Card>

      {siteList.length === 0 ? (
        <EmptyState
          title="No sites yet"
          body="Add your first site above. Attendance sheets are created per site, per day."
        />
      ) : (
        <div className="grid gap-3">
          {siteList.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  );
}

function SiteCard({ site }: { site: Site }) {
  return (
    <Card className="grid gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink">{site.name}</p>
        {site.active ? <Chip tone="positive">Active</Chip> : <Chip tone="neutral">Inactive</Chip>}
      </div>

      <ActionForm
        action={renameSite}
        resetKey={site.name}
        submitLabel="Rename"
        className="gap-2"
      >
        <input type="hidden" name="id" value={site.id} />
        <Field label="Rename site">
          <Input name="name" defaultValue={site.name} required minLength={2} maxLength={120} />
        </Field>
      </ActionForm>

      <div className="pt-1">
        <ConfirmDialog
          label="Delete site"
          title="Delete this site?"
          message="This permanently deletes the site and all of its attendance history. This cannot be undone."
          action={deleteSite}
          hiddenFields={{ id: site.id }}
        />
      </div>
    </Card>
  );
}