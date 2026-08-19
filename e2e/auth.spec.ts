import { expect, test } from "@playwright/test";

import {
  createCompany,
  PASSWORD,
  signIn,
  signOut,
  signUp,
  uniqueEmail,
} from "./helpers";

test.describe("auth flows", () => {
  test("signs up, creates a company, signs out and back in", async ({ page }) => {
    const email = uniqueEmail("owner");

    await signUp(page, email);

    await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible();
    await createCompany(page, "E2E Cleaning Co");

    await signOut(page);

    await signIn(page, email);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Today at a glance/ })).toBeVisible();
  });

  test("shows a friendly error for a wrong password", async ({ page }) => {
    const email = uniqueEmail("wrongpw");

    await signUp(page, email);
    await createCompany(page, "Wrong PW Co");
    await signOut(page);

    await signIn(page, email, "totally-wrong");
    await expect(page.getByText("Wrong email or password. Check them and try again.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("rejects a short password at signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.locator('input[name="fullName"]').fill("E2E Tester");
    await page.locator('input[name="email"]').fill(uniqueEmail("shortpw"));
    await page.locator('input[name="password"]').fill("short");
    await page.locator('input[name="confirmPassword"]').fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    // The password input has minLength={8}, so native browser validation
    // blocks submission before the server action runs.
    const validationMessage = await page
      .locator('input[name="password"]')
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test("rejects mismatched passwords at signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.locator('input[name="fullName"]').fill("E2E Tester");
    await page.locator('input[name="email"]').fill(uniqueEmail("mismatch"));
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill("different123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("toggles dark mode and persists the choice", async ({ page }) => {
    const email = uniqueEmail("themer");

    await signUp(page, email);
    await createCompany(page, "Theme Co");

    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "Switch to dark mode" });

    await expect(html).not.toHaveClass(/dark/);
    await toggle.click();
    await expect(html).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(html).not.toHaveClass(/dark/);

    await page.reload();
    await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  });
});
