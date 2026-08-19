import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

const SESSION_COOKIE_PREFIX = "sb-";

/**
 * Client used inside proxy.ts to refresh expired auth sessions
 * on every request and re-set the session cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!supabaseUrl() || !supabasePublishableKey()) {
    return supabaseResponse;
  }

  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith(SESSION_COOKIE_PREFIX));
  if (!hasSessionCookie) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}