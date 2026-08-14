import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { BrandLockup } from "@/components/brand";
import { BottomNav, TopNav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Chip } from "@/components/ui";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (!ctx.company || !ctx.role) redirect("/onboarding");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLockup compact />
            <span className="hidden h-6 w-px bg-border sm:block" />
            <span className="hidden max-w-[40vw] truncate text-sm font-medium text-ink-soft sm:block">
              {ctx.company.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TopNav role={ctx.role} />
            <Chip tone="neutral">{ROLE_LABELS[ctx.role]}</Chip>
            <ThemeToggle />
            <UserMenu email={ctx.user.email} name={ctx.user.full_name} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:pb-12">
        {children}
      </main>

      <BottomNav role={ctx.role} />
    </div>
  );
}