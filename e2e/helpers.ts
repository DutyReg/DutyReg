import { expect, type Locator, type Page } from "@playwright/test";

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

export async function signIn(
  page: Page,
  email: string,
  password = PASSWORD,
  destination: RegExp | null = /\/dashboard/,
) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (destination) {
    await expect(page).toHaveURL(destination, { timeout: 15_000 });
  }
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
  await expect(hoursForm.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
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

// ---------------------------------------------------------------------------
// Settings: company
// ---------------------------------------------------------------------------

/** Update the company name on /settings and wait for the success banner. */
export async function updateCompanyName(page: Page, name: string) {
  await page.goto("/settings");
  const nameForm = page.locator('form:has(input[name="name"])');
  await nameForm.locator('input[name="name"]').fill(name);
  await nameForm.getByRole("button", { name: "Save" }).click();
  await expect(nameForm.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Settings: sites
// ---------------------------------------------------------------------------

/** The Card (nearest `.rounded-xl`) showing an exact-text match for `label`. */
function cardByText(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
}

export async function renameSite(page: Page, oldName: string, newName: string) {
  await page.goto("/settings/sites");
  const card = cardByText(page, oldName);
  const nameInput = card.locator('form input[name="name"]');
  await nameInput.fill(newName);
  await card.getByRole("button", { name: "Rename" }).click();
  await expectPageText(page, newName, oldName);
}

export async function deleteSite(page: Page, siteName: string) {
  await page.goto("/settings/sites");
  const card = cardByText(page, siteName);
  await card.getByRole("button", { name: "Delete site" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(siteName, { exact: true })).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Settings: workers
// ---------------------------------------------------------------------------

function workerEditForm(page: Page, workerName: string): Locator {
  return cardByText(page, workerName).locator('form:has(input[name="id"])');
}

/** Add a worker, optionally assigning them to an active site. */
export async function addWorkerWithSite(page: Page, name: string, code: string, siteName?: string) {
  await page.goto("/settings/workers");
  const addForm = page.locator('form:has(input[name="workerCode"])').first();
  await addForm.locator('input[name="name"]').fill(name);
  await addForm.locator('input[name="workerCode"]').fill(code);
  if (siteName) {
    await addForm.locator('select[name="siteId"]').selectOption({ label: siteName });
  }
  await addForm.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function editWorker(page: Page, oldName: string, newName: string) {
  await page.goto("/settings/workers");
  const editForm = workerEditForm(page, oldName);
  await editForm.locator('input[name="name"]').fill(newName);
  await editForm.getByRole("button", { name: "Save changes" }).click();
  await expectPageText(page, newName, oldName);
}

export async function deleteWorker(page: Page, workerName: string) {
  await page.goto("/settings/workers");
  const card = cardByText(page, workerName);
  await card.getByRole("button", { name: "Delete worker" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(workerName, { exact: true })).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Settings: members (team)
// ---------------------------------------------------------------------------

/** The Card (nearest `.rounded-xl`) showing `email` — a team member row. */
function memberCard(page: Page, email: string): Locator {
  return cardByText(page, email);
}

function memberRoleForm(page: Page, email: string): Locator {
  return memberCard(page, email).locator('form:has(input[name="userId"])');
}

export async function addMember(page: Page, email: string, role: string) {
  await page.goto("/settings/members");
  const addForm = page.locator('form:has(input[name="email"])');
  await addForm.locator('input[name="email"]').fill(email);
  await addForm.locator('select[name="role"]').selectOption(role);
  await addForm.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible({ timeout: 20_000 });
}

export async function changeMemberRole(page: Page, email: string, role: string) {
  await page.goto("/settings/members");
  const form = memberRoleForm(page, email);
  // The new role is reflected in the member's role form select after revalidation.
  await form.locator('select[name="role"]').selectOption(role);
  await form.getByRole("button", { name: "Change role" }).click();
  await expect(memberRoleForm(page, email).locator('select[name="role"]')).toHaveValue(role, {
    timeout: 20_000,
  });
}

export async function removeMember(page: Page, email: string) {
  await page.goto("/settings/members");
  const card = memberCard(page, email);
  await card.getByRole("button", { name: "Remove from company" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(email, { exact: true })).toHaveCount(0, { timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

/** Wait for `newText` to appear and `oldText` to disappear (exact matches). */
export async function expectPageText(page: Page, newText: string, oldText: string) {
  await expect(page.getByText(newText, { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(oldText, { exact: true })).toHaveCount(0);
}