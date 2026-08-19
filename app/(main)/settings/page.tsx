import Link from "next/link";
import { redirect } from "next/navigation";

import { updateCompanyHours, updateCompanyName } from "@/app/actions/company";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, SectionTitle } from "@/components/ui";
import { requireContext } from "@/lib/auth";

export const metadata = { title: "Company" };

export default async function SettingsPage() {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 px-5 py-6">
        <div className="grid gap-1">
          <SectionTitle>Company</SectionTitle>
          <p className="text-sm text-muted">
            This name appears on reports shared via WhatsApp.
          </p>
        </div>
        <ActionForm action={updateCompanyName}>
          <Field label="Company name">
            <Input
              name="name"
              defaultValue={ctx.company.name}
              required
              minLength={2}
              maxLength={120}
            />
          </Field>
        </ActionForm>
      </Card>

      <Card className="grid gap-4 px-5 py-6">
        <div className="grid gap-1">
          <SectionTitle>Work hours</SectionTitle>
          <p className="text-sm text-muted">
            The company-wide shift times. Marking attendance starts every worker
            at these times; an in-time later than the start time is recorded as Late.
          </p>
        </div>
        <ActionForm action={updateCompanyHours}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <Input
                name="start_time"
                type="time"
                defaultValue={ctx.company.start_time?.slice(0, 5)}
                required
              />
            </Field>
            <Field label="End time">
              <Input
                name="end_time"
                type="time"
                defaultValue={ctx.company.end_time?.slice(0, 5)}
                required
              />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card className="grid gap-3 px-5 py-6">
        <SectionTitle>Shortcuts</SectionTitle>
        <div className="grid gap-2">
          <SettingsShortcut
            href="/settings/sites"
            title="Sites"
            blurb="Where your workers attend — add or deactivate sites."
          />
          <SettingsShortcut
            href="/settings/workers"
            title="Workers"
            blurb="Keep the worker list current. Deactivate workers who left."
          />
          <SettingsShortcut
            href="/settings/members"
            title="Team"
            blurb="Give supervisors and viewers access to your company."
          />
        </div>
      </Card>

      <p className="px-1 text-xs text-muted">
        Signed in as {ctx.user.email}. You are the owner of this company.
      </p>
    </div>
  );
}

function SettingsShortcut({
  href,
  title,
  blurb,
}: {
  href: string;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="grid gap-0.5 rounded-xl border border-border bg-surface-soft px-4 py-3 transition-colors hover:border-border-strong"
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="text-xs text-muted">{blurb}</span>
    </Link>
  );
}