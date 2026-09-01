import { expect, test } from "@playwright/test";

import {
  addMember,
  changeMemberRole,
  createCompany,
  goto,
  PASSWORD,
  removeMember,
  signUp,
  uniqueEmail,
} from "./helpers";

test.describe("team members", () => {
  test("shows the owner card labelled (you) with no removal affordance", async ({ page }) => {
    const email = uniqueEmail("self");
    await signUp(page, email);
    await createCompany(page, "Self Co");

    await goto(page, "/settings/members");
    await expect(page.getByText("(you)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove from company" })).toHaveCount(0);
  });

  test("rejects an invalid member email with a friendly error", async ({ page }) => {
    const email = uniqueEmail("invalidadd");
    await signUp(page, email);
    await createCompany(page, "InvalidAdd Co");

    await goto(page, "/settings/members");
    const addForm = page.locator('form:has(input[name="email"])');
    const emailInput = addForm.locator('input[name="email"]');
    await emailInput.fill("not-an-email");
    await addForm.getByRole("button", { name: "Save" }).click();

    // The email input has type="email" + required, so native browser validation
    // rejects the value before the server action runs.
    const message = await emailInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(message.length).toBeGreaterThan(0);
  });

  test("owner adds a viewer, then changes their role and removes them", async ({ browser }) => {
    const ownerEmail = uniqueEmail("memberowner");
    const memberEmail = uniqueEmail("memberuser");
    const password = PASSWORD;

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUp(ownerPage, ownerEmail, password);
    await createCompany(ownerPage, "Members Co");

    // The person must have signed up on DutyReg before the owner can add them.
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await signUp(memberPage, memberEmail, password);
    await expect(memberPage.getByRole("heading", { name: "Get started" })).toBeVisible();

    // Add as viewer.
    await addMember(ownerPage, memberEmail, "viewer");
    await expect(ownerPage.getByText(memberEmail, { exact: true })).toBeVisible({ timeout: 20_000 });

    // Change role to supervisor.
    await changeMemberRole(ownerPage, memberEmail, "supervisor");
    await expect(
      ownerPage.getByRole("navigation", { name: "Settings sections" }),
    ).toBeVisible();

    // Remove the member.
    await removeMember(ownerPage, memberEmail);

    await ownerContext.close();
    await memberContext.close();
  });

  test("owner can add a supervisor member directly", async ({ browser }) => {
    const ownerEmail = uniqueEmail("superowner");
    const memberEmail = uniqueEmail("superuser");
    const password = PASSWORD;

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUp(ownerPage, ownerEmail, password);
    await createCompany(ownerPage, "Super Co");

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await signUp(memberPage, memberEmail, password);

    await addMember(ownerPage, memberEmail, "supervisor");
    await expect(ownerPage.getByText(memberEmail, { exact: true })).toBeVisible({ timeout: 20_000 });

    await ownerContext.close();
    await memberContext.close();
  });
});
