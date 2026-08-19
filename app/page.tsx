import { redirect } from "next/navigation";

import { getContext } from "@/lib/auth";

export default async function Home() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  redirect(ctx.company ? "/dashboard" : "/onboarding");
}