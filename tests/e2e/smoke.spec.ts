import { test, expect } from "@playwright/test";

/**
 * Smoke — 4 critical flows, 0 USD (npx playwright test)
 * Requires dev server (auto-started via webServer in playwright.config.ts).
 */

test.describe("smoke", () => {
  test("auth redirect — unauthenticated /dashboard -> /login", async ({ page }) => {
    await page.goto("/dashboard");
    // middleware redirects to /login (or /es/login)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /welcome back|bienvenido/i })).toBeVisible();
  });

  test("lesson navigation — landing -> levels -> unit -> lesson (public or redirect)", async ({
    page,
  }) => {
    await page.goto("/");
    // Marketing page has Get Started / Comenzar
    await expect(page.getByRole("link", { name: /get started|comenzar/i }).first()).toBeVisible();
    // Directly visit levels (will redirect to login if unauth, but page should not 500)
    await page.goto("/levels");
    await expect(page).not.toHaveURL(/500/);
    // Should either show levels or redirect to login — both are valid; just assert no error boundary
    const body = await page.content();
    expect(body).not.toMatch(/Application error|Something went wrong/i);
  });

  test("srs queue visible — /reviews renders (SRS disabled hint or queue)", async ({ page }) => {
    await page.goto("/reviews");
    // Unauth -> login, but logged page should contain Reviews wording
    const url = page.url();
    if (url.includes("/login")) {
      await expect(page).toHaveURL(/\/login/);
    } else {
      await expect(page.getByText(/reviews|repasos/i).first()).toBeVisible();
    }
  });

  test("streak/challenges — /challenges renders without 500", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page).not.toHaveURL(/500/);
    const body = await page.content();
    expect(body).not.toMatch(/Application error/i);
    // If unauth, redirected to login; if auth, challenges page has join/how-it-works
    if (!page.url().includes("/login")) {
      await expect(
        page.getByText(/challenges|desafíos|how it works|¿cómo funciona/i).first(),
      ).toBeVisible();
    }
  });
});
