import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { needsConfiguration } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Company, Member, Role, UserContext } from "@/lib/types";

/** Single session lookup per render pass; all call sites share one network call. */
const getSessionUser = cache(async (): Promise<User | null> => {
  if (needsConfiguration()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

interface MembershipRow {
  id: string;
  company_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  companies: Company | null;
}

const getMembership = cache(
  async (
    user: User,
  ): Promise<{ member: Member | null; company: Company | null }> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_members")
      .select(
        "id, company_id, user_id, role, created_at, companies(id, name, start_time, end_time, created_at)",
      )
      .eq("user_id", user.id)
      .maybeSingle<MembershipRow>();

    if (!data) return { member: null, company: null };

    return {
      member: {
        id: data.id,
        company_id: data.company_id,
        user_id: data.user_id,
        role: data.role,
        created_at: data.created_at,
      },
      company: data.companies,
    };
  },
);

/** Current user context; null when signed out. */
export async function getContext(): Promise<UserContext | null> {
  if (needsConfiguration()) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const { member, company } = await getMembership(user);

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    company,
    member,
    role: member?.role ?? null,
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
