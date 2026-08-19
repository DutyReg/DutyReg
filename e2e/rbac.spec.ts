import { expect, test } from "@playwright/test";

import {
  addSite,
  addWorker,
  createCompany,
  PASSWORD,
  signUp,
  uniqueEmail,
} from "./helpers";

test.describe("role-based access", () => {
  test("viewer is read-only; supervisor can mark attendance but not manage settings", async ({
    browser,
  }) => {
    const ownerEmail = uniqueEmail("owner");
    const memberEmail = uniqueEmail("member");
    const password = PASSWORD;

    // Owner: sign up, create company, invite the second user as viewer.
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUp(ownerPage, ownerEmail, password);
    await createCompany(ownerPage, "RBAC Co");

    // Member: sign up first (required by add_company_member).
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await signUp(memberPage, memberEmail, password);
    await expect(memberPage.getByRole("heading", { name: "Get started" })).toBeVisible();

    // Owner adds the member as a viewer.
    await ownerPage.goto("/settings/members");
    await ownerPage.locator('form input[name="email"]').fill(memberEmail);
    await ownerPage.locator('form select[name="role"]').selectOption("viewer");
    await ownerPage.locator('form:has(input[name="email"])').getByRole("button", { name: "Save" }).click();
    await expect(ownerPage.locator('form:has(input[name="email"])').getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Member is still signed in from signUp. As a viewer they land on the
    // dashboard directly (no onboarding).
    await memberPage.goto("/dashboard");
    await expect(memberPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Viewer: no Settings in the nav; /settings and /attendance redirect away.
    await expect(memberPage.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await memberPage.goto("/settings");
    await expect(memberPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await memberPage.goto("/attendance");
    await expect(memberPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Owner adds a site, a worker and marks the day so the viewer has a real report.
    await addSite(ownerPage, "HQ Office");
    await addWorker(ownerPage, "Amara Wickramasinghe", "W101");
    await ownerPage.goto("/attendance");
    await expect(ownerPage.getByRole("button", { name: "Mark all present" })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Mark all present" }).click();
    await expect(ownerPage.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Viewer still sees the day's report and the share affordances.
    await memberPage.goto("/dashboard");
    await expect(memberPage.getByText("You are viewing. Ask your supervisor to share the report.")).toBeVisible();
    await expect(memberPage.getByRole("button", { name: "Share on WhatsApp" })).toBeVisible();

    // Owner promotes the member to supervisor.
    await ownerPage.goto("/settings/members");
    const changeRoleForm = ownerPage.locator("form").filter({
      has: ownerPage.getByRole("button", { name: "Change role" }),
    });
    await changeRoleForm.locator('select[name="role"]').selectOption("supervisor");
    await changeRoleForm.getByRole("button", { name: "Change role" }).click();
    await expect(changeRoleForm.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Supervisor: can now mark attendance, but settings still redirect.
    await memberPage.getByRole("link", { name: "Mark" }).click();
    await expect(memberPage).toHaveURL(/\/attendance/, { timeout: 15_000 });
    await expect(memberPage.getByRole("button", { name: "Mark all present" })).toBeVisible();
    await memberPage.goto("/settings");
    await expect(memberPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await ownerContext.close();
    await memberContext.close();
  });

  test("owner can manage sites, workers and team; role chips reflect access", async ({ browser }) => {
    const ownerEmail = uniqueEmail("own2");
    const memberEmail = uniqueEmail("mem2");

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUp(ownerPage, ownerEmail);
    await createCompany(ownerPage, "Owner Co");

    // Owner sees the full settings nav.
    await ownerPage.goto("/settings/members");
    await expect(ownerPage.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Team" })).toBeVisible();

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await signUp(memberPage, memberEmail);

    // Add as viewer, then confirm the members list shows the role.
    await ownerPage.goto("/settings/members");
    await ownerPage.locator('form input[name="email"]').fill(memberEmail);
    await ownerPage.locator('form select[name="role"]').selectOption("viewer");
    await ownerPage.locator('form:has(input[name="email"])').getByRole("button", { name: "Save" }).click();
    await expect(ownerPage.locator('form:has(input[name="email"])').getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
    // The members list re-renders via the action's RSC payload; dev-mode
    // recompilation can exceed the default 5s, so wait up to 20s.
    await expect(ownerPage.getByText(memberEmail, { exact: true })).toBeVisible({ timeout: 20_000 });

    await ownerContext.close();
    await memberContext.close();
  });
});