import { expect, test } from "@playwright/test";

import {
  addSite,
  addWorker,
  addWorkerWithSite,
  createCompany,
  expectSaved,
  markStatus,
  setWorkHours,
  signUp,
  uniqueEmail,
  workerCard,
} from "./helpers";

test.describe("attendance UI", () => {
  test("switching sites loads that site's worker list", async ({ page }) => {
    const email = uniqueEmail("siteswitch");
    await signUp(page, email);
    await createCompany(page, "SiteSwitch Co");

    await addSite(page, "Site A");
    await addSite(page, "Site B");
    await addWorkerWithSite(page, "Alice", "A01", "Site A");
    await addWorkerWithSite(page, "Bob", "B01", "Site B");

    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    await expect(page.locator("#site-jump")).toHaveValue(/./);
    await expect(workerCard(page, "Alice")).toBeVisible();

    // Switch to Site B -> only Alice's sibling on B shows.
    await page.locator("#site-jump").selectOption({ label: "Site A" });
    await expect(workerCard(page, "Alice")).toBeVisible();

    // Site B has Bob; switching should show Bob (Alice is on Site A).
    await page.locator("#site-jump").selectOption({ label: "Site B" });
    await expect(workerCard(page, "Bob")).toBeVisible({ timeout: 15_000 });
  });

  test("time fields appear for present/late and are hidden for absent", async ({ page }) => {
    const email = uniqueEmail("conditionaltime");
    await signUp(page, email);
    await createCompany(page, "ConditionalTime Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Nimal Perera", "W001");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    const card = workerCard(page, "Nimal Perera");
    // Initially unknown: no time inputs.
    await expect(card.locator('input[type="time"]')).toHaveCount(0);

    // Mark present -> time inputs appear.
    await markStatus(page, "Nimal Perera", "Present");
    await expect(card.locator('input[type="time"]')).toHaveCount(2);

    // Mark absent -> time inputs disappear.
    await markStatus(page, "Nimal Perera", "Absent");
    await expect(card.locator('input[type="time"]')).toHaveCount(0);
  });

  test("out time is editable and persists after reload", async ({ page }) => {
    const email = uniqueEmail("outtime");
    await signUp(page, email);
    await createCompany(page, "OutTime Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Kumari Silva", "W002");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    const card = workerCard(page, "Kumari Silva");
    await markStatus(page, "Kumari Silva", "Present");
    const outTime = card.locator('input[type="time"]').nth(1);
    await outTime.fill("16:30");
    await expectSaved(page);

    await page.reload();
    await expect(workerCard(page, "Kumari Silva").locator('input[type="time"]').nth(1)).toHaveValue("16:30");
  });

  test("notes are editable and persist after reload", async ({ page }) => {
    const email = uniqueEmail("note");
    await signUp(page, email);
    await createCompany(page, "Note Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Ruwan Fernando", "W003");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    const card = workerCard(page, "Ruwan Fernando");
    await markStatus(page, "Ruwan Fernando", "Present");
    await card.getByPlaceholder("Left early, half day, etc.").fill("Half day");
    await expectSaved(page);

    await page.reload();
    await expect(workerCard(page, "Ruwan Fernando").getByPlaceholder("Left early, half day, etc.")).toHaveValue("Half day");
  });

  test("the save chip shows Not saved then settles on Saved after a change", async ({ page }) => {
    const email = uniqueEmail("chip");
    await signUp(page, email);
    await createCompany(page, "Chip Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Amara Wickramasinghe", "W004");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    // Editing flips the chip to "Not saved" before the 900ms debounce fires.
    await workerCard(page, "Amara Wickramasinghe").getByRole("button", { name: "Present", exact: true }).click();
    await expect(page.getByText("Not saved", { exact: true })).toBeVisible();
    await expectSaved(page);
  });

  test("Mark all present only fills workers still unknown", async ({ page }) => {
    const email = uniqueEmail("markall");
    await signUp(page, email);
    await createCompany(page, "MarkAll Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Nimal Perera", "W005");
    await addWorker(page, "Kumari Silva", "W006");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    // Mark Nimal absent first.
    await markStatus(page, "Nimal Perera", "Absent");
    await expect(workerCard(page, "Nimal Perera").getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "true");

    // Mark all present should only fill Kumari (unknown), not touch Nimal (absent).
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);
    await expect(workerCard(page, "Kumari Silva").getByRole("button", { name: "Present" })).toHaveAttribute("aria-pressed", "true");
    await expect(workerCard(page, "Nimal Perera").getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "true");
  });

  test("copy to clipboard shows Copied feedback", async ({ page, context }) => {
    const email = uniqueEmail("copy");
    await signUp(page, email);
    await createCompany(page, "Copy Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Saman Gunawardena", "W007");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy text" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible({ timeout: 15_000 });
  });

  test("the default in-time fills from work hours and applies the late rule", async ({ page }) => {
    const email = uniqueEmail("defaulttime");
    await signUp(page, email);
    await createCompany(page, "DefaultTime Co");

    await addSite(page, "Main Site");
    await addWorker(page, "Chamari Atapattu", "W008");
    await setWorkHours(page, "08:00", "17:00");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    const card = workerCard(page, "Chamari Atapattu");
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);
    await expect(card.locator('input[type="time"]').nth(0)).toHaveValue("08:00");

    // A later in-time than the default start is recorded as Late.
    await card.locator('input[type="time"]').nth(0).fill("08:45");
    await expectSaved(page);
    await expect(card.getByRole("button", { name: "Late" })).toHaveAttribute("aria-pressed", "true");
  });
});
