import { expect, type Page } from "@playwright/test";

export const PASSWORD = "password123";

/** Unique email per test so parallel runs never collide. */
export function uniqueEmail(label: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return `${label}-${stamp}@test.local`;
}

export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.locator('input[name="fullName"]').fill("E2E Tester");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function createCompany(page: Page, name: string) {
  await page.locator('input[name="name"]').fill(name);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page).toHaveURL(/\/settings\?company=/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
}

export async function setWorkHours(page: Page, start: string, end: string) {
  await page.goto("/settings");
  const hoursForm = page.locator('form:has(input[name="start_time"])');
  await hoursForm.locator('input[name="start_time"]').fill(start);
  await hoursForm.locator('input[name="end_time"]').fill(end);
  await hoursForm.getByRole("button", { name: "Save" }).click();
  await expect(hoursForm.getByText("Saved.", { exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function addSite(page: Page, name: string) {
  await page.goto("/settings/sites");
  await page.locator('form input[name="name"]').first().fill(name);
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function addWorker(page: Page, name: string, code: string) {
  await page.goto("/settings/workers");
  await page.locator('form input[name="name"]').first().fill(name);
  await page.locator('form input[name="workerCode"]').first().fill(code);
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Wait until the autosave chip settles on "Saved" (debounce + upsert). */
export async function expectSaved(page: Page) {
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
}

export function workerCard(page: Page, workerName: string) {
  return page.locator("li").filter({ has: page.getByText(workerName, { exact: true }) });
}

export async function markStatus(page: Page, workerName: string, status: "Present" | "Absent" | "Late") {
  await workerCard(page, workerName).getByRole("button", { name: status, exact: true }).click();
  await expectSaved(page);
}