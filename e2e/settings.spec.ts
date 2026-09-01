import { expect, test } from "@playwright/test";

import {
  addSite,
  addWorkerWithSite,
  createCompany,
  deleteSite,
  deleteWorker,
  editWorker,
  goto,
  renameSite,
  signUp,
  uniqueEmail,
  updateCompanyName,
} from "./helpers";

test.describe("settings", () => {
  test("updates the company name and it persists after reload", async ({ page }) => {
    const email = uniqueEmail("company");
    await signUp(page, email);
    await createCompany(page, "Original Co");

    await updateCompanyName(page, "Renamed Co");

    // The company-name action does not auto-revalidate; persistence shows on reload.
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue("Renamed Co");
  });

  test("rejects an empty company name via native required validation", async ({ page }) => {
    const email = uniqueEmail("companyreq");
    await signUp(page, email);
    await createCompany(page, "Val Co");

    await goto(page, "/settings");
    const nameForm = page.locator('form:has(input[name="name"])');
    const nameInput = nameForm.locator('input[name="name"]');
    await nameInput.fill("");
    await nameForm.getByRole("button", { name: "Save" }).click();

    const message = await nameInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(message.length).toBeGreaterThan(0);
  });

  test("updates work hours and they persist in the form", async ({ page }) => {
    const email = uniqueEmail("hours");
    await signUp(page, email);
    await createCompany(page, "Hours Co");

    await goto(page, "/settings");
    const hoursForm = page.locator('form:has(input[name="start_time"])');
    await hoursForm.locator('input[name="start_time"]').fill("07:30");
    await hoursForm.locator('input[name="end_time"]').fill("16:30");
    await hoursForm.getByRole("button", { name: "Save" }).click();
    await expect(hoursForm.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(hoursForm.locator('input[name="start_time"]')).toHaveValue("07:30");
    await expect(hoursForm.locator('input[name="end_time"]')).toHaveValue("16:30");
  });

  test("rejects empty work hours via native required validation", async ({ page }) => {
    const email = uniqueEmail("hoursreq");
    await signUp(page, email);
    await createCompany(page, "HReq Co");

    await goto(page, "/settings");
    const hoursForm = page.locator('form:has(input[name="start_time"])');
    const startInput = hoursForm.locator('input[name="start_time"]');
    await startInput.fill("");
    await hoursForm.locator('input[name="end_time"]').fill("");
    await hoursForm.getByRole("button", { name: "Save" }).click();

    const message = await startInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(message.length).toBeGreaterThan(0);
  });

  test("adds a site and it appears with an Active chip", async ({ page }) => {
    const email = uniqueEmail("addsite");
    await signUp(page, email);
    await createCompany(page, "AddSite Co");

    await addSite(page, "Colombo Branch");
    const card = page.locator("div").filter({ has: page.getByText("Colombo Branch", { exact: true }) });
    await expect(card.getByText("Active", { exact: true })).toBeVisible();
  });

  test("renames a site inline and the old name disappears", async ({ page }) => {
    const email = uniqueEmail("renamesite");
    await signUp(page, email);
    await createCompany(page, "RenameSite Co");

    await addSite(page, "Old Site");
    await renameSite(page, "Old Site", "New Site");
  });

  test("deletes a site through the confirmation dialog", async ({ page }) => {
    const email = uniqueEmail("delsite");
    await signUp(page, email);
    await createCompany(page, "DelSite Co");

    await addSite(page, "Doomed Site");
    await deleteSite(page, "Doomed Site");
  });

  test("shows the empty state before any site is added", async ({ page }) => {
    const email = uniqueEmail("emptysite");
    await signUp(page, email);
    await createCompany(page, "EmptySite Co");

    await goto(page, "/settings/sites");
    await expect(page.getByText("No sites yet", { exact: true })).toBeVisible();
  });

  test("adds a worker with a code and site assignment", async ({ page }) => {
    const email = uniqueEmail("addworker");
    await signUp(page, email);
    await createCompany(page, "AddWorker Co");

    await addSite(page, "HQ");
    await addWorkerWithSite(page, "Nimal Perera", "W010", "HQ");
    await expect(page.getByText("Nimal Perera", { exact: true })).toBeVisible();
    await expect(page.getByText("W010", { exact: true })).toBeVisible();
  });

  test("adds a worker without a code or site", async ({ page }) => {
    const email = uniqueEmail("addworkernocode");
    await signUp(page, email);
    await createCompany(page, "NoCode Co");

    await addWorkerWithSite(page, "Kumari Silva", "");
    await expect(page.getByText("Kumari Silva", { exact: true })).toBeVisible();
  });

  test("edits a worker name and the old name disappears", async ({ page }) => {
    const email = uniqueEmail("editworker");
    await signUp(page, email);
    await createCompany(page, "EditWorker Co");

    await addWorkerWithSite(page, "Old Worker", "W020");
    await editWorker(page, "Old Worker", "New Worker");
  });

  test("deletes a worker through the confirmation dialog", async ({ page }) => {
    const email = uniqueEmail("delworker");
    await signUp(page, email);
    await createCompany(page, "DelWorker Co");

    await addWorkerWithSite(page, "Doomed Worker", "W030");
    await deleteWorker(page, "Doomed Worker");
  });

  test("settings sub-navigation highlights the active section", async ({ page }) => {
    const email = uniqueEmail("settingsnav");
    await signUp(page, email);
    await createCompany(page, "SettingsNav Co");

    const nav = page.getByRole("navigation", { name: "Settings sections" });
    const sections = [
      { label: "Company", path: "/settings" },
      { label: "Sites", path: "/settings/sites" },
      { label: "Workers", path: "/settings/workers" },
      { label: "Team", path: "/settings/members" },
    ] as const;

    for (const { label, path } of sections) {
      await goto(page, path);
      const link = nav.getByRole("link", { name: label });
      await expect(link).toHaveAttribute("aria-current", "page");
      if (label !== "Company") {
        await expect(nav.getByRole("link", { name: "Company" })).not.toHaveAttribute("aria-current", "page");
      }
    }
  });
});
