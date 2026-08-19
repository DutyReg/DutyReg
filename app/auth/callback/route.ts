import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback: exchanges the Supabase auth code for a session,
 * then continues based on whether the user has a company yet.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();

      const target = membership?.company_id ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(new URL(target, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}