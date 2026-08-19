import { describe, expect, it, vi } from "vitest";

import { fakeSupabase, asSupabaseClient } from "@/tests/helpers/fake-supabase";

vi.mock("@/lib/env", () => ({ needsConfiguration: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

type AuthModule = typeof import("@/lib/auth");

async function loadAuth() {
  vi.resetModules();
  const env = await import("@/lib/env");
  const supabaseServer = await import("@/lib/supabase/server");
  const auth: AuthModule = await import("@/lib/auth");
  const needsConfiguration = vi
    .mocked(env.needsConfiguration)
    .mockReset()
    .mockReturnValue(false);
  const createClient = vi.mocked(supabaseServer.createClient).mockReset();
  return { auth, needsConfiguration, createClient };
}

const user = {
  id: "u1",
  email: "kasun@test.com",
  user_metadata: { full_name: "Kasun Silva" },
};

const membershipRow = {
  id: "m1",
  company_id: "c1",
  user_id: "u1",
  role: "owner",
  created_at: "2026-08-01T00:00:00.000Z",
  companies: {
    id: "c1",
    name: "Acme",
    start_time: "08:00",
    end_time: "17:00",
    created_at: "2026-08-01T00:00:00.000Z",
  },
};

describe("getContext", () => {
  it("returns null when configuration is missing, without touching supabase", async () => {
    const { auth, needsConfiguration, createClient } = await loadAuth();
    needsConfiguration.mockReturnValue(true);

    expect(await auth.getContext()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns null when there is no signed-in user", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(asSupabaseClient(fakeSupabase()));

    expect(await auth.getContext()).toBeNull();
  });

  it("returns null membership details when the user has no company", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(fakeSupabase({ user, tables: { company_members: [{ data: null }] } })),
    );

    const ctx = await auth.getContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.role).toBeNull();
    expect(ctx?.company).toBeNull();
    expect(ctx?.member).toBeNull();
    expect(ctx?.user).toEqual({
      id: "u1",
      email: "kasun@test.com",
      full_name: "Kasun Silva",
    });
  });

  it("maps membership and company when present", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(fakeSupabase({ user, tables: { company_members: [{ data: membershipRow }] } })),
    );

    const ctx = await auth.getContext();
    expect(ctx?.role).toBe("owner");
    expect(ctx?.company).toEqual(membershipRow.companies);
    expect(ctx?.member).toEqual({
      id: "m1",
      company_id: "c1",
      user_id: "u1",
      role: "owner",
      created_at: "2026-08-01T00:00:00.000Z",
    });
  });

  it("falls back to null full name when user_metadata is absent", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(
        fakeSupabase({
          user: { id: "u1", email: "x@test.com", user_metadata: {} },
          tables: { company_members: [{ data: membershipRow }] },
        }),
      ),
    );

    const ctx = await auth.getContext();
    expect(ctx?.user.full_name).toBeNull();
  });
});

describe("requireContext", () => {
  it("redirects to /login when signed out", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(asSupabaseClient(fakeSupabase()));

    await expect(auth.requireContext()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("returns the context when signed in", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(fakeSupabase({ user, tables: { company_members: [{ data: membershipRow }] } })),
    );

    const ctx = await auth.requireContext();
    expect(ctx.role).toBe("owner");
  });
});

describe("redirectIfSignedIn", () => {
  it("does not redirect when signed out", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(asSupabaseClient(fakeSupabase()));

    await expect(auth.redirectIfSignedIn()).resolves.toBeUndefined();
  });

  it("redirects to /onboarding when signed in without a company", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(fakeSupabase({ user, tables: { company_members: [{ data: null }] } })),
    );

    await expect(auth.redirectIfSignedIn()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("redirects to /dashboard when signed in with a company", async () => {
    const { auth, createClient } = await loadAuth();
    createClient.mockResolvedValue(
      asSupabaseClient(fakeSupabase({ user, tables: { company_members: [{ data: membershipRow }] } })),
    );

    await expect(auth.redirectIfSignedIn()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });
});
