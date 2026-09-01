import { describe, expect, it } from "vitest";

import {
  addCompanyMember,
  anonClient,
  checkDbReachable,
  createCompany,
  signUpUser,
} from "@/tests/helpers/db-rls";

const reachable = await checkDbReachable();

describe.skipIf(!reachable)("db-rls", () => {
  it("anon cannot create a company or write to tables, but can read", async () => {
    const anon = anonClient();

    const rpc = await anon.rpc("create_company", { p_name: "Nope" });
    expect(rpc.error).toBeTruthy();

    const insert = await anon.from("companies").insert({ name: "Nope" });
    expect(insert.error).toBeTruthy();

    const update = await anon
      .from("companies")
      .update({ name: "Nope" })
      .eq("name", "anything")
      .select("*");
    // Depending on the environment, this may raise a permission error (anon
    // lacks UPDATE grant → error + data null) or return a silent no-op (RLS
    // filters all rows → no error, data []). In both cases no rows were
    // modified — assert the result set is empty.
    expect(!update.data || update.data.length === 0).toBe(true);

    const select = await anon.from("companies").select("*");
    expect(select.error).toBeNull();
    expect(select.data).toEqual([]);
  });

  it("create_company makes the caller the owner and applies work-hour defaults", async () => {
    const owner = await signUpUser("db-owner");
    const companyId = await createCompany(owner.client, "DB Test Co");
    expect(companyId).toBeTruthy();

    const { data: company } = await owner.client
      .from("companies")
      .select("name, start_time, end_time")
      .eq("id", companyId)
      .single();
    expect(company).not.toBeNull();
    expect(company!.name).toBe("DB Test Co");
    expect(company!.start_time).toBe("08:00:00");
    expect(company!.end_time).toBe("17:00:00");

    const { data: members } = await owner.client
      .from("company_members")
      .select("company_id, role")
      .eq("company_id", companyId);
    expect(members).not.toBeNull();
    expect(members).toHaveLength(1);
    expect(members![0].role).toBe("owner");
  });

  it("a user can only belong to one company", async () => {
    const owner = await signUpUser("db-owner2");
    await createCompany(owner.client, "First Co");

    const { error } = await owner.client.rpc("create_company", {
      p_name: "Second Co",
    });
    expect(error).toBeTruthy();
  });

  it("non-members cannot read or write another company's data", async () => {
    const owner = await signUpUser("db-owner3");
    const companyId = await createCompany(owner.client, "Isolation Co");
    const outsider = await signUpUser("db-outsider3");

    const { error: siteError } = await owner.client
      .from("sites")
      .insert({ company_id: companyId, name: "Site A", active: true });
    expect(siteError).toBeNull();

    for (const table of ["sites", "workers", "attendance_sheets", "attendance_entries"]) {
      const { data } = await outsider.client.from(table).select("*");
      expect(data).toEqual([]);
    }

    const hack = await outsider.client
      .from("sites")
      .insert({ company_id: companyId, name: "Hacked", active: true });
    expect(hack.error).toBeTruthy();
  });

  it("members can read each other's profiles; outsiders cannot", async () => {
    const owner = await signUpUser("db-owner5");
    const companyId = await createCompany(owner.client, "Profiles Co");
    const member = await signUpUser("db-member5");
    const outsider = await signUpUser("db-outsider5");

    const add = await addCompanyMember(
      owner.client,
      companyId,
      member.email,
      "viewer",
    );
    expect(add.error).toBeNull();

    const memberProfile = await owner.client
      .from("profiles")
      .select("email, full_name")
      .eq("email", member.email)
      .maybeSingle();
    expect(memberProfile.error).toBeNull();
    expect(memberProfile.data).toBeTruthy();

    const ownerProfile = await member.client
      .from("profiles")
      .select("email")
      .eq("email", owner.email)
      .maybeSingle();
    expect(ownerProfile.error).toBeNull();
    expect(ownerProfile.data).toBeTruthy();

    const hidden = await outsider.client
      .from("profiles")
      .select("email")
      .eq("email", member.email)
      .maybeSingle();
    expect(hidden.error).toBeNull();
    expect(hidden.data).toBeNull();
  });

  it("viewer can read but not write; supervisor can write sheets and entries but not sites or workers", async () => {
    const owner = await signUpUser("db-owner4");
    const companyId = await createCompany(owner.client, "Roles Co");
    const member = await signUpUser("db-member4");
    const add = await addCompanyMember(
      owner.client,
      companyId,
      member.email,
      "viewer",
    );
    expect(add.error).toBeNull();

    const { data: siteRow } = await owner.client
      .from("sites")
      .insert({ company_id: companyId, name: "Depot", active: true })
      .select()
      .single();
    const { data: workerRow } = await owner.client
      .from("workers")
      .insert({
        company_id: companyId,
        name: "Nimal",
        worker_code: "N001",
        active: true,
      })
      .select()
      .single();

    const sheetPayload = {
      company_id: companyId,
      site_id: siteRow.id,
      sheet_date: "2026-08-19",
    };

    // Viewer writes are rejected across the board.
    const viewerWrites = [
      member.client
        .from("sites")
        .insert({ company_id: companyId, name: "X", active: true }),
      member.client
        .from("workers")
        .insert({ company_id: companyId, name: "X", worker_code: "X", active: true }),
      member.client.from("attendance_sheets").insert(sheetPayload),
      member.client
        .from("attendance_entries")
        .insert({ sheet_id: siteRow.id, worker_id: workerRow.id, status: "present" }),
    ];
    for (const write of viewerWrites) {
      const { error } = await write;
      expect(error).toBeTruthy();
    }

    // Viewer can still read the company's data.
    const { data: viewerSites } = await member.client
      .from("sites")
      .select("*")
      .eq("company_id", companyId);
    expect(viewerSites).toHaveLength(1);

    // Owner promotes the member to supervisor.
    const promote = await owner.client.rpc("update_company_member", {
      p_company: companyId,
      p_user_id: member.id,
      p_role: "supervisor",
    });
    expect(promote.error).toBeNull();

    // Supervisor: sheets and entries are writable.
    const sheet = await member.client
      .from("attendance_sheets")
      .insert(sheetPayload)
      .select()
      .single();
    expect(sheet.error).toBeNull();

    const entry = await member.client
      .from("attendance_entries")
      .insert({
        sheet_id: sheet.data.id,
        worker_id: workerRow.id,
        status: "present",
        in_time: "08:00:00",
        out_time: "17:00:00",
      })
      .select()
      .single();
    expect(entry.error).toBeNull();

    // Supervisor: sites and workers are still owner-only.
    const supervisorSite = await member.client
      .from("sites")
      .insert({ company_id: companyId, name: "X", active: true });
    expect(supervisorSite.error).toBeTruthy();
    const supervisorWorker = await member.client
      .from("workers")
      .insert({
        company_id: companyId,
        name: "X",
        worker_code: "X",
        active: true,
      });
    expect(supervisorWorker.error).toBeTruthy();

    // A company member can read entries through the sheet join (no company_id on entries).
    const { data: entries } = await member.client
      .from("attendance_entries")
      .select("*")
      .eq("sheet_id", sheet.data.id);
    expect(entries).not.toBeNull();
    expect(entries).toHaveLength(1);
    expect(entries![0].status).toBe("present");
  });

  it("status check accepts late and rejects garbage values", async () => {
    const owner = await signUpUser("db-owner7");
    const companyId = await createCompany(owner.client, "Status Co");

    const { data: siteRow } = await owner.client
      .from("sites")
      .insert({ company_id: companyId, name: "HQ", active: true })
      .select()
      .single();
    const { data: workerRow } = await owner.client
      .from("workers")
      .insert({
        company_id: companyId,
        name: "Kumari",
        worker_code: "K001",
        active: true,
      })
      .select()
      .single();
    const { data: sheet } = await owner.client
      .from("attendance_sheets")
      .insert({
        company_id: companyId,
        site_id: siteRow.id,
        sheet_date: "2026-08-19",
      })
      .select()
      .single();

    const late = await owner.client
      .from("attendance_entries")
      .insert({
        sheet_id: sheet.id,
        worker_id: workerRow.id,
        status: "late",
        in_time: "08:45:00",
      })
      .select()
      .single();
    expect(late.error).toBeNull();
    expect(late.data.status).toBe("late");

    const garbage = await owner.client
      .from("attendance_entries")
      .insert({
        sheet_id: sheet.id,
        worker_id: workerRow.id,
        status: "on-time",
      });
    expect(garbage.error).toBeTruthy();
  });

  it("member management RPCs enforce ownership", async () => {
    const owner = await signUpUser("db-owner6");
    const companyId = await createCompany(owner.client, "Members Co");
    const member = await signUpUser("db-member6");

    const unknown = await addCompanyMember(
      owner.client,
      companyId,
      "nobody@test.local",
      "viewer",
    );
    expect(unknown.error).toBeTruthy();

    const add = await addCompanyMember(
      owner.client,
      companyId,
      member.email,
      "viewer",
    );
    expect(add.error).toBeNull();

    // Re-adding the same user upserts their role instead of failing.
    const reAdd = await addCompanyMember(
      owner.client,
      companyId,
      member.email,
      "supervisor",
    );
    expect(reAdd.error).toBeNull();
    const { data: roleRow } = await owner.client
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", member.id)
      .single();
    expect(roleRow).not.toBeNull();
    expect(roleRow!.role).toBe("supervisor");

    // A non-owner cannot manage members.
    const memberAdd = await addCompanyMember(
      member.client,
      companyId,
      "someone-else@test.local",
      "viewer",
    );
    expect(memberAdd.error).toBeTruthy();

    // The owner cannot change their own role.
    const selfChange = await owner.client.rpc("update_company_member", {
      p_company: companyId,
      p_user_id: owner.id,
      p_role: "viewer",
    });
    expect(selfChange.error).toBeTruthy();

    // Removing a member revokes their access.
    const remove = await owner.client.rpc("remove_company_member", {
      p_company: companyId,
      p_user_id: member.id,
    });
    expect(remove.error).toBeNull();
    const { data: afterRemove } = await member.client
      .from("companies")
      .select("id");
    expect(afterRemove).toEqual([]);
  });
});