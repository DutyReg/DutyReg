"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

interface RealtimeTable {
  table: string;
  companyId?: string;
}

/**
 * Subscribes to Postgres changes on the given tables and refreshes the
 * current route's RSC payload whenever a row changes. RLS on the database
 * decides which events this user may see. Place once per page.
 */
export function RealtimeRefresher({ tables }: { tables: RealtimeTable[] }) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const tablesKey = JSON.stringify(tables);

  useEffect(() => {
    const supabase = createClient();
    const channels = JSON.parse(tablesKey).map(({ table, companyId }: RealtimeTable) => {
      const config = {
        event: "*" as const,
        schema: "public",
        table,
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
      };
      return supabase
        .channel(`rt-${table}`)
        .on("postgres_changes", config, () => {
          const now = Date.now();
          if (now - lastRefresh.current < 250) return;
          lastRefresh.current = now;
          router.refresh();
        })
        .subscribe();
    });

    return () => {
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [tablesKey, router]);

  return null;
}