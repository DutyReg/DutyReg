import { cache } from "react";
import { redirect } from "next/navigation";

import { needsConfiguration } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { UserContext } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  if (needsConfiguration()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

const getMembership = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return { ...data, profile };
});

/** Current user context; null when signed out. */
export async function getContext(): Promise<UserContext | null> {
  if (needsConfiguration()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await getMembership();
  let company = null;
  if (membership) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name, created_at")
      .eq("id", membership.company_id)
      .maybeSingle();
    company = companyData;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    company,
    member: membership,
    role: membership?.role ?? null,
  };
}

/** Context required for logged-in pages; redirects to /login when signed out. */
export async function requireContext(): Promise<UserContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Redirects away from auth pages when a user is already signed in. */
export async function redirectIfSignedIn() {
  const ctx = await getContext();
  if (!ctx) return;
  redirect(ctx.company ? "/dashboard" : "/onboarding");
}