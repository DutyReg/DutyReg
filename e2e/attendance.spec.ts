import { expect, test } from "@playwright/test";

import {
  addSite,
  addWorker,
  createCompany,
  expectSaved,
  markStatus,
  setWorkHours,
  signUp,
  uniqueEmail,
  workerCard,
} from "./helpers";

test.describe("attendance marking", () => {
  test("marks all present, toggles to absent, applies the late rule and saves", async ({ page }) => {
    const email = uniqueEmail("att");
    await signUp(page, email);
    await createCompany(page, "Attendance Co");

    await addSite(page, "Colombo Main Site");
    await addWorker(page, "Nimal Perera", "W001");
    await addWorker(page, "Kumari Silva", "W002");

    // A default shift makes "Mark all present" fill times and enables the
    // late rule (in-time after 08:00 is recorded as Late).
    await setWorkHours(page, "08:00", "17:00");
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });

    // Mark all present fills both workers with default times.
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);

    await expect(workerCard(page, "Nimal Perera").getByRole("button", { name: "Present" })).toHaveAttribute("aria-pressed", "true");
    await expect(workerCard(page, "Kumari Silva").getByRole("button", { name: "Present" })).toHaveAttribute("aria-pressed", "true");

    // Toggle Kumari to absent.
    await markStatus(page, "Kumari Silva", "Absent");
    await expect(workerCard(page, "Kumari Silva").getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "true");

    // Set an in-time after the default start (08:00) -> the late rule kicks in.
    const nimalCard = workerCard(page, "Nimal Perera");
    await nimalCard.locator('input[type="time"]').first().fill("08:45");
    await expectSaved(page);
    await expect(nimalCard.getByRole("button", { name: "Late" })).toHaveAttribute("aria-pressed", "true");

    // Reload: marks persisted server-side.
    await page.reload();
    await expect(workerCard(page, "Nimal Perera").getByRole("button", { name: "Late" })).toHaveAttribute("aria-pressed", "true");
    await expect(workerCard(page, "Kumari Silva").getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "true");

    // Dashboard reflects the day's counts.
    await page.getByRole("link", { name: "Today" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    const nimalRow = page.locator("li").filter({ has: page.getByText("Nimal Perera", { exact: true }) });
    await expect(nimalRow.getByText("Late", { exact: true })).toBeVisible();
    const kumariRow = page.locator("li").filter({ has: page.getByText("Kumari Silva", { exact: true }) });
    await expect(kumariRow.getByText("Absent", { exact: true })).toBeVisible();
    await expect(page.getByText("2 workers", { exact: true })).toBeVisible();
  });

  test("shares the report via WhatsApp with the correct text", async ({ page, context }) => {
    const email = uniqueEmail("share");
    await signUp(page, email);
    await createCompany(page, "Share Co");

    await addSite(page, "Galle Town House");
    await addWorker(page, "Ruwan Fernando", "W003");

    await page.getByRole("link", { name: "Mark" }).click();
    await page.getByRole("button", { name: "Mark all present" }).click();
    await expectSaved(page);

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: "Share on WhatsApp" }).click(),
    ]);
    const url = popup.url();
    // wa.me redirects to api.whatsapp.com/send/?text=...
    expect(url).toMatch(/^https:\/\/(wa\.me\/\?text=|api\.whatsapp\.com\/send\/\?text=)/);
    const text = decodeURIComponent(url.split("text=")[1].split("&")[0].replace(/\+/g, "%20"));
    expect(text).toContain("DutyReg Attendance Report");
    expect(text).toContain("Company: Share Co");
    expect(text).toContain("Site: Galle Town House");
    expect(text).toContain("Ruwan Fernando");
    expect(text).toContain("Present: 1 | Absent: 0 | Late: 0");
    await popup.close();
  });
});
