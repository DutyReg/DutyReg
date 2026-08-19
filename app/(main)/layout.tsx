import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (!ctx.company || !ctx.role) redirect("/onboarding");

  return <AppShell ctx={ctx}>{children}</AppShell>;
}