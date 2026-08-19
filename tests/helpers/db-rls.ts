import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const PUBLISHABLE_KEY =
  process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const PASSWORD = "password123";

export function uniqueEmail(label: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return `${label}-${stamp}@test.local`;
}

export async function checkDbReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY);
}

export interface TestUser {
  client: SupabaseClient;
  email: string;
  id: string;
}

export async function signUpUser(label: string): Promise<TestUser> {
  const email = uniqueEmail(label);
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    email,
    password: PASSWORD,
  });
  if (error || !data.user) {
    throw new Error(`signUp failed for ${email}: ${error?.message}`);
  }
  return { client, email, id: data.user.id };
}

export async function createCompany(
  client: SupabaseClient,
  name: string,
): Promise<string> {
  const { data, error } = await client.rpc("create_company", { p_name: name });
  if (error) throw new Error(`create_company failed: ${error.message}`);
  return data as string;
}

export async function addCompanyMember(
  client: SupabaseClient,
  companyId: string,
  email: string,
  role: "owner" | "supervisor" | "viewer",
) {
  return client.rpc("add_company_member", {
    p_company: companyId,
    p_email: email,
    p_role: role,
  });
}