import { expect, test } from "@playwright/test";

import {
  addSite,
  addWorkerWithSite,
  createCompany,
  expectSaved,
  goto,
  signUp,
  uniqueEmail,
} from "./helpers";

/**
 * Builds an owner with one site, one worker and a fully marked attendance
 * sheet for today, so the dashboard has a report to render.
 */
async function seedMarkedDay(page: import("@playwright/test").Page, email: string, company: string) {
  await signUp(page, email);
  await createCompany(page, company);
  await addSite(page, "Main Site");
  await addWorkerWithSite(page, "Amara Wickramasinghe", "D001", "Main Site");

  await goto(page, "/attendance");
  await page.getByRole("button", { name: "Mark all present" }).click();
  await expectSaved(page);
}

test.describe("dashboard", () => {
  test("renders the summary cards and the ReportShare controls", async ({ page }) => {
    const email = uniqueEmail("dashcore");
    await seedMarkedDay(page, email, "DashCore Co");

    await goto(page, "/dashboard");
    await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();

    // The four summary labels render. "Present" also appears on the worker's
    // row chip, so assert each via `.first()` to avoid strict-mode collisions.
    for (const label of ["Present", "Late", "Absent", "Not marked"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("1 worker", { exact: true })).toBeVisible();

    // The dashboard ReportShare path (distinct from the attendance page share).
    await expect(page.getByRole("button", { name: "Share on WhatsApp" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy text" })).toBeVisible();
  });

  test("navigates between days and locks the 'Next day' link on today", async ({ page }) => {
    const email = uniqueEmail("dashnav");
    await seedMarkedDay(page, email, "DashNav Co");

    await goto(page, "/dashboard");
    await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
    // On today the right arrow is a disabled span, not a link.
    await expect(page.getByRole("link", { name: "Next day" })).toHaveCount(0);

    await page.getByRole("link", { name: "Previous day" }).click();
    await expect(page).toHaveURL(/\/dashboard\?date=/, { timeout: 15_000 });
    await expect(page.getByText("Past day", { exact: true })).toBeVisible();

    // A past day exposes the "Next day" link again so you can come back.
    await expect(page.getByRole("link", { name: "Next day" })).toHaveCount(1);
    await page.getByRole("link", { name: "Next day" }).click();
    await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible({ timeout: 15_000 });
  });

  test("switches the report between sites via the dashboard site selector", async ({ page }) => {
    const email = uniqueEmail("dashsite");
    await signUp(page, email);
    await createCompany(page, "DashSite Co");

    await addSite(page, "Branch A");
    await addSite(page, "Branch B");
    await addWorkerWithSite(page, "Alice", "A01", "Branch A");
    await addWorkerWithSite(page, "Bob", "B01", "Branch B");

    // Mark Bob present on Branch B.
    await goto(page, "/attendance");
    await page.locator("#site-jump").selectOption({ label: "Branch B" });
    await expect(page.getByRole("button", { name: "Mark all present" })).toBeVisible();
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);

    // Dashboard: the site selector appears when there are 2+ active sites.
    await goto(page, "/dashboard");
    console.log("DEBUG DASHBOARD:\n", await page.locator("body").innerText());
    const siteSelect = page.locator('form[action="/dashboard"] select[name="site"]');
    await expect(siteSelect).toBeVisible();
    // The default site is the first by name (Branch A → Alice).
    await expect(page.getByText("Alice", { exact: true })).toBeVisible();
    await expect(page.getByText("Bob", { exact: true })).toHaveCount(0);

    // Switching the site select auto-submits and loads Branch B's report.
    await siteSelect.selectOption({ label: "Branch B" });
    await expect(page.getByText("Bob", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Alice", { exact: true })).toHaveCount(0);
  });

  test("links back to the dashboard from settings and exposes the shortcut cards", async ({ page }) => {
    const email = uniqueEmail("dashback");
    await signUp(page, email);
    await createCompany(page, "DashBack Co");

    // Settings shortcut cards link to the sub-pages.
    await goto(page, "/settings");
    await page
      .getByRole("link", { name: /Sites/ })
      .filter({ hasText: "add or deactivate sites" })
      .click();
    await expect(page).toHaveURL(/\/settings\/sites/, { timeout: 15_000 });

    // "Back to dashboard" returns to the dashboard.
    await page.getByRole("link", { name: "Back to dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
