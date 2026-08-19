import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase, asSupabaseClient } from "@/tests/helpers/fake-supabase";
import type { OwnerContext, UserContext } from "@/lib/types";

vi.mock("@/lib/auth", () => ({ getContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { signInWithPassword, signOut, signUp } from "@/app/actions/auth";
import { createCompany, updateCompanyHours, updateCompanyName } from "@/app/actions/company";
import {
  addMember,
  removeMember,
  updateMemberRole,
} from "@/app/actions/members";
import { addSite, deleteSite, renameSite } from "@/app/actions/sites";
import {
  addWorker,
  deleteWorker,
  updateWorker,
} from "@/app/actions/workers";

const ownerContext: OwnerContext = {
  user: { id: "u1", email: "owner@test.com", full_name: "Owner" },
  company: {
    id: "c1",
    name: "Acme",
    start_time: "08:00",
    end_time: "17:00",
    created_at: "2026-08-01T00:00:00.000Z",
  },
  member: {
    id: "m1",
    company_id: "c1",
    user_id: "u1",
    role: "owner",
    created_at: "2026-08-01T00:00:00.000Z",
  },
  role: "owner",
};

const supervisorContext: UserContext = { ...ownerContext, role: "supervisor" };

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(asSupabaseClient(fakeSupabase()));
});

describe("signInWithPassword", () => {
  it("rejects empty fields", async () => {
    expect(await signInWithPassword(form({ email: "", password: "" }))).toEqual({
      error: "Enter your email and password.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("maps invalid login credentials to a friendly message", async () => {
    vi.mocked(createClient).mockImplementation(async () => {
      const client = fakeSupabase();
      vi.mocked(client.auth.signInWithPassword).mockImplementation(async () => ({
        error: { message: "Invalid login credentials" },
      }));
      return asSupabaseClient(client);
    });

    const result = await signInWithPassword(form({ email: "a@b.com", password: "secret" }));
    expect(result).toEqual({ error: "Wrong email or password. Check them and try again." });
  });

  it("passes through other supabase errors", async () => {
    vi.mocked(createClient).mockImplementation(async () => {
      const client = fakeSupabase();
      vi.mocked(client.auth.signInWithPassword).mockImplementation(async () => ({
        error: { message: "rate limited" },
      }));
      return asSupabaseClient(client);
    });

    const result = await signInWithPassword(form({ email: "a@b.com", password: "secret" }));
    expect(result).toEqual({ error: "rate limited" });
  });
});

describe("signUp", () => {
  it("rejects a short full name", async () => {
    expect(await signUp(form({ fullName: "A", email: "a@b.com", password: "12345678", confirmPassword: "12345678" }))).toEqual({
      error: "Enter your full name.",
    });
  });

  it("rejects an invalid email", async () => {
    expect(await signUp(form({ fullName: "Kasun", email: "nope", password: "12345678", confirmPassword: "12345678" }))).toEqual({
      error: "Enter a valid email address.",
    });
  });

  it("rejects a short password", async () => {
    expect(await signUp(form({ fullName: "Kasun", email: "a@b.com", password: "short", confirmPassword: "short" }))).toEqual({
      error: "Password must be at least 8 characters long.",
    });
  });

  it("rejects mismatched passwords", async () => {
    expect(await signUp(form({ fullName: "Kasun", email: "a@b.com", password: "12345678", confirmPassword: "87654321" }))).toEqual({
      error: "Passwords do not match.",
    });
  });

  it("maps already-registered errors to a friendly message", async () => {
    vi.mocked(createClient).mockImplementation(async () => {
      const client = fakeSupabase();
      vi.mocked(client.auth.signUp).mockImplementation(async () => ({
        error: { message: "User already registered" },
      }));
      return asSupabaseClient(client);
    });

    const result = await signUp(form({ fullName: "Kasun", email: "a@b.com", password: "12345678", confirmPassword: "12345678" }));
    expect(result).toEqual({
      error: "An account with this email already exists. Sign in instead.",
    });
  });

  it("signs up successfully", async () => {
    const result = await signUp(form({ fullName: "Kasun", email: "a@b.com", password: "12345678", confirmPassword: "12345678" }));
    expect(result).toEqual({ success: true });
  });
});

describe("signOut", () => {
  it("signs out and redirects to /login", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});

describe("addSite", () => {
  it("blocks non-owners before touching supabase", async () => {
    vi.mocked(getContext).mockResolvedValue(supervisorContext);

    expect(await addSite(form({ name: "Site A" }))).toEqual({
      error: "Only the owner can manage sites.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects names shorter than 2 characters", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await addSite(form({ name: "A" }))).toEqual({
      error: "Enter a site name (at least 2 characters).",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("passes through supabase errors", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase({ tables: { sites: [{ error: { message: "insert failed" } }] } });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addSite(form({ name: "Site A" }))).toEqual({ error: "insert failed" });
  });

  it("inserts with the company id and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addSite(form({ name: "Site A" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({
      table: "sites",
      method: "insert",
      args: [{ company_id: "c1", name: "Site A" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/sites");
  });
});

describe("renameSite", () => {
  it("rejects short names", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await renameSite(form({ id: "s1", name: "A" }))).toEqual({
      error: "Enter a site name (at least 2 characters).",
    });
  });

  it("updates scoped to the company and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await renameSite(form({ id: "s1", name: "New Name" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({
      table: "sites",
      method: "update",
      args: [{ name: "New Name" }],
    });
    expect(client.history).toContainEqual({ table: "sites", method: "eq", args: ["id", "s1"] });
    expect(client.history).toContainEqual({ table: "sites", method: "eq", args: ["company_id", "c1"] });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/sites");
  });
});

describe("deleteSite", () => {
  it("deletes scoped to the company and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await deleteSite(form({ id: "s1" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({ table: "sites", method: "delete", args: [] });
    expect(client.history).toContainEqual({ table: "sites", method: "eq", args: ["id", "s1"] });
    expect(client.history).toContainEqual({ table: "sites", method: "eq", args: ["company_id", "c1"] });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/sites");
  });
});

describe("addWorker", () => {
  it("rejects short names", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await addWorker(form({ name: "A" }))).toEqual({
      error: "Enter a worker name (at least 2 characters).",
    });
  });

  it("inserts with null code and site when not provided", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addWorker(form({ name: "Nimal" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({
      table: "workers",
      method: "insert",
      args: [{ company_id: "c1", site_id: null, name: "Nimal", worker_code: null }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/workers");
  });

  it("inserts code and site when provided", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addWorker(form({ name: "Nimal", workerCode: "W001", siteId: "s1" }))).toEqual({
      success: true,
    });
    expect(client.history).toContainEqual({
      table: "workers",
      method: "insert",
      args: [{ company_id: "c1", site_id: "s1", name: "Nimal", worker_code: "W001" }],
    });
  });
});

describe("updateWorker", () => {
  it("updates scoped to the company and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await updateWorker(form({ id: "w1", name: "Nimal P", workerCode: "W002", siteId: "s2" }))).toEqual({
      success: true,
    });
    expect(client.history).toContainEqual({
      table: "workers",
      method: "update",
      args: [{ name: "Nimal P", worker_code: "W002", site_id: "s2" }],
    });
    expect(client.history).toContainEqual({ table: "workers", method: "eq", args: ["id", "w1"] });
    expect(client.history).toContainEqual({ table: "workers", method: "eq", args: ["company_id", "c1"] });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/workers");
  });
});

describe("deleteWorker", () => {
  it("deletes scoped to the company and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await deleteWorker(form({ id: "w1" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({ table: "workers", method: "delete", args: [] });
    expect(client.history).toContainEqual({ table: "workers", method: "eq", args: ["id", "w1"] });
    expect(client.history).toContainEqual({ table: "workers", method: "eq", args: ["company_id", "c1"] });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/workers");
  });
});

describe("addMember", () => {
  it("rejects invalid emails", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await addMember(form({ email: "not-an-email", role: "viewer" }))).toEqual({
      error: "Enter a valid email address.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects invalid roles", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await addMember(form({ email: "a@b.com", role: "superadmin" }))).toEqual({
      error: "Choose a valid role.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("calls the add_company_member rpc and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addMember(form({ email: "a@b.com", role: "viewer" }))).toEqual({
      success: true,
    });
    expect(client.history).toContainEqual({
      table: "rpc",
      method: "add_company_member",
      args: [{ p_company: "c1", p_email: "a@b.com", p_role: "viewer" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/members");
  });

  it("passes through rpc errors", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase({
      rpc: { add_company_member: [{ error: { message: "no such user" } }] },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await addMember(form({ email: "a@b.com", role: "viewer" }))).toEqual({
      error: "no such user",
    });
  });
});

describe("updateMemberRole", () => {
  it("rejects invalid roles", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await updateMemberRole(form({ userId: "u2", role: "boss" }))).toEqual({
      error: "Choose a valid role.",
    });
  });

  it("calls the update_company_member rpc and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await updateMemberRole(form({ userId: "u2", role: "supervisor" }))).toEqual({
      success: true,
    });
    expect(client.history).toContainEqual({
      table: "rpc",
      method: "update_company_member",
      args: [{ p_company: "c1", p_user_id: "u2", p_role: "supervisor" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/members");
  });
});

describe("removeMember", () => {
  it("blocks non-owners", async () => {
    vi.mocked(getContext).mockResolvedValue(supervisorContext);

    expect(await removeMember(form({ userId: "u2" }))).toEqual({
      error: "Only the owner can manage members.",
    });
  });

  it("calls the remove_company_member rpc and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await removeMember(form({ userId: "u2" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({
      table: "rpc",
      method: "remove_company_member",
      args: [{ p_company: "c1", p_user_id: "u2" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/members");
  });
});

describe("createCompany", () => {
  it("rejects short names", async () => {
    expect(await createCompany(form({ name: "A" }))).toEqual({
      error: "Enter a company name (at least 2 characters).",
    });
  });

  it("passes through rpc errors", async () => {
    const client = fakeSupabase({
      rpc: { create_company: [{ error: { message: "boom" } }] },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await createCompany(form({ name: "Acme" }))).toEqual({ error: "boom" });
  });

  it("redirects to settings with the new company id", async () => {
    const client = fakeSupabase({
      rpc: { create_company: [{ data: "new-company-id" }] },
    });
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    await expect(createCompany(form({ name: "Acme" }))).rejects.toThrow(
      "NEXT_REDIRECT:/settings?company=new-company-id",
    );
  });
});

describe("updateCompanyName", () => {
  it("blocks non-owners", async () => {
    vi.mocked(getContext).mockResolvedValue(supervisorContext);

    expect(await updateCompanyName(form({ name: "Acme" }))).toEqual({ error: "Access denied." });
  });

  it("updates and returns success", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await updateCompanyName(form({ name: "Acme Ltd" }))).toEqual({ success: true });
    expect(client.history).toContainEqual({
      table: "companies",
      method: "update",
      args: [{ name: "Acme Ltd" }],
    });
  });
});

describe("updateCompanyHours", () => {
  it("blocks non-owners", async () => {
    vi.mocked(getContext).mockResolvedValue(supervisorContext);

    expect(await updateCompanyHours(form({ start_time: "08:00", end_time: "17:00" }))).toEqual({
      error: "Access denied.",
    });
  });

  it("rejects non-padded times", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await updateCompanyHours(form({ start_time: "8:00", end_time: "17:00" }))).toEqual({
      error: "Enter valid times, e.g. 08:00 and 17:00.",
    });
  });

  it("rejects out-of-range times", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);

    expect(await updateCompanyHours(form({ start_time: "25:00", end_time: "17:00" }))).toEqual({
      error: "Enter valid times, e.g. 08:00 and 17:00.",
    });
  });

  it("updates and revalidates", async () => {
    vi.mocked(getContext).mockResolvedValue(ownerContext);
    const client = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(asSupabaseClient(client));

    expect(await updateCompanyHours(form({ start_time: "08:00", end_time: "17:00" }))).toEqual({
      success: true,
    });
    expect(client.history).toContainEqual({
      table: "companies",
      method: "update",
      args: [{ start_time: "08:00", end_time: "17:00" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
