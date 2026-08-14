"use client";

import { useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

/** Browser-side Supabase client (RLS-protected). Created once per session. */
export function useSupabaseClient() {
  return useMemo(() => createClient(), []);
}