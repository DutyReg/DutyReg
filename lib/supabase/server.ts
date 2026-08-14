import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Server client bound to the incoming request cookies.
 * Works in Server Components, Server Actions and Route Handlers.
 * All reads/writes are subject to Supabase Row Level Security.
 *
 * Memoized per render pass (React `cache`) so every call site in a
 * request shares one client — and Supabase's in-memory session token —
 * avoiding duplicate auth round trips.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Safe to ignore: middleware always refreshes sessions.
        }
      },
    },
  });
});