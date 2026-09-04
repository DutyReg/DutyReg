import { expect, test } from "@playwright/test";

import { createCompany, goto, signUp, uniqueEmail } from "./helpers";

test.describe("server-side error display", () => {
  test("shows the InlineError when adding a member with no account", async ({ page }) => {
    const email = uniqueEmail("errormember");
    await signUp(page, email);
    await createCompany(page, "ErrorMember Co");

    await goto(page, "/settings/members");
    const addForm = page.locator('form:has(input[name="email"])');
    // This email has a valid format but no auth profile, so the add_company_member
    // RPC raises and the ActionForm surfaces the server error inline.
    await addForm.locator('input[name="email"]').fill(uniqueEmail("noprofile"));
    await addForm.locator('select[name="role"]').selectOption("viewer");
    await addForm.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText("No account found for this email. Ask the person to sign up first, then add them again."),
    ).toBeVisible({ timeout: 15_000 });
  });
});
