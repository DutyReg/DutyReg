import { redirect } from "next/navigation";
import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { ChevronLeftIcon } from "@/components/icons";
import { SettingsLink } from "@/components/settings-link";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");
  if (ctx.role !== "owner") redirect("/dashboard");

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ChevronLeftIcon size={16} /> Back to dashboard
        </Link>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-muted">Manage your company, sites, workers and team.</p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Settings sections">
        <SettingsLink href="/settings" label="Company" />
        <SettingsLink href="/settings/sites" label="Sites" />
        <SettingsLink href="/settings/workers" label="Workers" />
        <SettingsLink href="/settings/members" label="Team" />
      </nav>

      {children}
    </div>
  );
}