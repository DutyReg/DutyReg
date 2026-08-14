import { createCompany } from "@/app/actions/company";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, SectionTitle } from "@/components/ui";
import { requireContext } from "@/lib/auth";

export const metadata = {
  title: "Get started",
};

export default async function OnboardingPage() {
  const ctx = await requireContext();

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Get started</h1>
        <p className="text-sm text-muted">
          You are signed in but not linked to a company yet.
        </p>
      </div>

      <Card className="grid gap-4 px-5 py-6">
        <SectionTitle>Create your company</SectionTitle>
        <p className="text-sm text-muted">
          Start your own company on DayMark and become its owner. You will be able
          to add sites, workers and team members.
        </p>
        <ActionForm
          action={createCompany}
          submitLabel="Create company"
          successMessage="Company created. Welcome aboard!"
        >
          <Field label="Company name" hint="For example: Sunrise Cleaning Services">
            <Input name="name" required minLength={2} maxLength={120} autoComplete="organization" />
          </Field>
        </ActionForm>
      </Card>

      <Card className="grid gap-2 px-5 py-6">
        <SectionTitle>Joining an existing company?</SectionTitle>
        <p className="text-sm text-muted">
          Ask the company owner to add you by email. Once they do, this page will
          take you straight to your dashboard on your next visit.
        </p>
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-ink dark:bg-zinc-800">
          Your email: <span className="font-mono text-xs">{ctx.user.email}</span>
        </p>
      </Card>
    </div>
  );
}