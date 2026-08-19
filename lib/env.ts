export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function supabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
}

/** True when the app is running without real Supabase credentials. */
export function needsConfiguration(): boolean {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  return (
    !url ||
    !key ||
    url.includes("your-project.supabase.co") ||
    key === "your-publishable-key"
  );
}