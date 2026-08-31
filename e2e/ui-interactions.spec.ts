import { expect, test } from "@playwright/test";

import { addSite, createCompany, signUp, uniqueEmail } from "./helpers";

test.describe("UI interactions", () => {
  test("the confirm dialog closes on Escape without deleting", async ({ page }) => {
    const email = uniqueEmail("dialogesc");
    await signUp(page, email);
    await createCompany(page, "DialogEsc Co");

    await addSite(page, "Keep Me");
    await page.goto("/settings/sites");
    await page.getByRole("button", { name: "Delete site" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    // The site is untouched.
    await expect(page.getByText("Keep Me", { exact: true })).toBeVisible();
  });

  test("the confirm dialog closes on backdrop click without deleting", async ({ page }) => {
    const email = uniqueEmail("dialogbackdrop");
    await signUp(page, email);
    await createCompany(page, "DialogBackdrop Co");

    await addSite(page, "Keep Me Too");
    await page.goto("/settings/sites");
    await page.getByRole("button", { name: "Delete site" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Click the dimmed overlay just outside the dialog to dismiss it.
    await page.mouse.click(20, 20);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Keep Me Too", { exact: true })).toBeVisible();
  });

  test("the cancel button closes the confirm dialog without deleting", async ({ page }) => {
    const email = uniqueEmail("dialogcancel");
    await signUp(page, email);
    await createCompany(page, "DialogCancel Co");

    await addSite(page, "Cancelled Site");
    await page.goto("/settings/sites");
    await page.getByRole("button", { name: "Delete site" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Cancelled Site", { exact: true })).toBeVisible();
  });

  test("the user menu opens on click and closes on outside click", async ({ page }) => {
    const email = uniqueEmail("menudismiss");
    await signUp(page, email);
    await createCompany(page, "MenuDismiss Co");

    const menuButton = page.getByRole("button", { name: "Account menu" });
    await menuButton.click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();

    // Click elsewhere in the page to dismiss the menu.
    await page.getByRole("link", { name: "Mark" }).click();
    await expect(page).toHaveURL(/\/attendance/, { timeout: 15_000 });
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toHaveCount(0);
  });

  test("the user menu closes on Escape", async ({ page }) => {
    const email = uniqueEmail("menuesc");
    await signUp(page, email);
    await createCompany(page, "MenuEsc Co");

    const menuButton = page.getByRole("button", { name: "Account menu" });
    await menuButton.click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toHaveCount(0);
  });

  test("the login page shows an OAuth error banner", async ({ page }) => {
    await page.goto("/login?error=auth");
    await expect(page.getByText("Google sign-in did not complete. Try again.")).toBeVisible();
  });

  test("the login page shows the Google sign-in option", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});
