import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { BrandLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (ctx.company) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <BrandLockup compact />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu email={ctx.user.email} name={ctx.user.full_name} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">{children}</main>
    </div>
  );
}