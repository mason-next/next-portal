import { test, expect } from "@playwright/test";

// Auth / route-protection behavior around the Microsoft Entra ID sign-in.
// The real Microsoft OAuth round-trip can't run headlessly without live Entra
// credentials, so these cover the surrounding Portal routes and guards:
// login rendering, redirects, access-denied, the public health check, API
// protection, authenticated access, and sign-out. (Plan tests D, E, G, I, J.)

test.describe("unauthenticated", () => {
  // No session cookie for this group.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page renders with the Microsoft sign-in button", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /sign in with microsoft/i })).toBeVisible();
    // Break-glass password form is hidden until the Administrator toggle is used.
    await expect(page.getByRole("button", { name: /administrator sign-in/i })).toBeVisible();
  });

  test("Administrator sign-in toggle reveals the password form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    // Retry the click until it takes effect — guards against clicking before React
    // hydration has attached the onClick handler. Once the form shows, the toggle
    // button detaches, so the click is skipped and the assertion holds.
    await expect(async () => {
      const toggle = page.getByRole("button", { name: /administrator sign-in/i });
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click({ timeout: 1000 }).catch(() => {});
      }
      await expect(page.getByLabel("Email")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("Test D — protected page redirects to /login", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("access-denied page renders and offers Sign out (no redirect loop)", async ({ page }) => {
    await page.goto("/access-denied", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/access-denied$/);
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("Test I — /api/health responds 200 without auth", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  test("Test G — protected API without a session is not served", async ({ request }) => {
    // Middleware gates protected API routes: an unauthenticated call is redirected
    // to /login (302) rather than returning data.
    const res = await request.get("/api/tasks/mine", { maxRedirects: 0 });
    expect(res.status()).not.toBe(200);
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toMatch(/\/login/);
  });
});

test.describe("authenticated", () => {
  // Uses the default storageState (tests/auth.json) created by global-setup.

  test("Test E — authenticated user can open a protected page", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/projects(\?|$)/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Test J — after sign-out, protected pages redirect to /login", async ({ page, request }) => {
    // Clear the Portal session cookie the way the Sign Out button does.
    await request.post("/api/auth/logout");
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
