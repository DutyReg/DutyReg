import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function MarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (!ctx.company || !ctx.role) redirect("/onboarding");

  return <AppShell ctx={ctx} maxWidth="max-w-5xl">{children}</AppShell>;
}