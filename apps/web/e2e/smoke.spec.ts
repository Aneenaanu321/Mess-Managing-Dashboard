import { test, expect } from "@playwright/test";

test.describe("Sales flow smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("leads list is reachable after login", async ({ page }) => {
    const email = process.env.E2E_EMAIL ?? "admin@ibtechintl.com";
    const password = process.env.E2E_PASSWORD ?? "Password123!";

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/(dashboard|new-inquiries)/, { timeout: 15_000 });
    await page.goto("/new-inquiries");
    await expect(page.getByRole("heading", { name: "New Inquiries" })).toBeVisible();
  });
});
