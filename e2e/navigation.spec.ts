import { expect, test } from "@playwright/test";

import { createCompany, goto, signUp, uniqueEmail } from "./helpers";

test.describe("navigation", () => {
  test("highlights the Today link on the dashboard", async ({ page }) => {
    const email = uniqueEmail("navtoday");
    await signUp(page, email);
    await createCompany(page, "NavToday Co");

    await goto(page, "/dashboard");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Mark" })).not.toHaveAttribute("aria-current", "page");
  });

  test("highlights the Mark link on the attendance screen", async ({ page }) => {
    const email = uniqueEmail("navmark");
    await signUp(page, email);
    await createCompany(page, "NavMark Co");

    await goto(page, "/attendance");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Mark" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current", "page");
  });

  test("highlights the Settings link on the settings screen", async ({ page }) => {
    const email = uniqueEmail("navsettings");
    await signUp(page, email);
    await createCompany(page, "NavSettings Co");

    await goto(page, "/settings");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current", "page");
  });

  test("owner sees Today, Mark and Settings links", async ({ page }) => {
    const email = uniqueEmail("navowner");
    await signUp(page, email);
    await createCompany(page, "NavOwner Co");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Mark" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("renders both the main nav on desktop and the bottom nav on mobile", async ({ page }) => {
    const email = uniqueEmail("navresponsive");
    await signUp(page, email);
    await createCompany(page, "NavResponsive Co");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Mark" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });
});
