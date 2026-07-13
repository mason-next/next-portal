/**
 * Org Chart Permissions & Feature Audit
 *
 * These tests run against the current session (typically Administrator in dev).
 * Admin-visible assertions are marked as such.
 *
 * For full Member/Viewer coverage: set up a second storageState with a Member
 * session and run the "Member read-only" describe block with that state.
 *
 * Permission rules enforced:
 *   Administrator — all tabs, Add Position button, sensitive form sections visible
 *   Member        — Chart + Positions + Reports tabs only; no Add/Edit controls; no sensitive data
 *   Viewer        — same as Member (read-only)
 */
import { test, expect } from "@playwright/test";

function ignoreNoise(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (
      t.includes("font") || t.includes("favicon") || t.includes("net::ERR") ||
      t.includes("cannot contain a nested") || t.includes("hydration") ||
      t.includes("Failed to load resource")
    ) return;
    errors.push(t);
  });
  return errors;
}

// ─── Administrator view ───────────────────────────────────────────────────────

test.describe("Org Chart — Administrator view", () => {
  test("loads /org-chart without console errors", async ({ page }) => {
    const errors = ignoreNoise(page);
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("heading", { name: /org chart/i }).first()).toBeVisible({ timeout: 20000 });
    expect(errors).toHaveLength(0);
  });

  test("admin sees Departments tab", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("button", { name: "Departments" })).toBeVisible({ timeout: 15000 });
  });

  test("admin sees Locations tab", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("button", { name: "Locations" })).toBeVisible({ timeout: 15000 });
  });

  test("admin sees Certifications tab", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("button", { name: "Certifications" })).toBeVisible({ timeout: 15000 });
  });

  test("admin sees Add Position button in header", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    const addBtn = page.getByRole("button", { name: /add position/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 15000 });
  });

  test("admin can open position form and see sensitive sections", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });

    // Click Add Position to open the modal
    const addBtn = page.getByRole("button", { name: /add position/i }).first();
    await addBtn.waitFor({ timeout: 15000 });
    await addBtn.click();

    // Modal should open — title field visible
    await expect(page.getByPlaceholder(/solutions engineer/i)).toBeVisible({ timeout: 8000 });

    // Compensation & Budget section should be visible (admin-only sensitive section)
    await expect(page.getByText(/compensation.*budget/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("admin can reach Departments tab content", async ({ page }) => {
    await page.goto("/org-chart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByRole("button", { name: "Departments" }).click();
    await expect(page.getByRole("heading", { name: "Departments", level: 3 })).toBeVisible({ timeout: 8000 });
  });
});

// ─── Feature flag ─────────────────────────────────────────────────────────────

test.describe("Org Chart — Feature flag", () => {
  test("Org Chart header icon is present when flag is enabled", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
    const link = page.locator('header a[title="Org Chart"], header a[href="/org-chart"]');
    await expect(link.first()).toBeVisible({ timeout: 15000 });
  });
});

// ─── Regression ───────────────────────────────────────────────────────────────

test.describe("Org Chart permissions — regression: other modules unaffected", () => {
  test("/projects still loads", async ({ page }) => {
    const errors = ignoreNoise(page);
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible({ timeout: 15000 });
    expect(errors).toHaveLength(0);
  });

  test("/tasks still loads", async ({ page }) => {
    const errors = ignoreNoise(page);
    await page.goto("/tasks", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByRole("heading", { name: /^(all team )?tasks$/i, level: 1 })).toBeVisible({ timeout: 15000 });
    expect(errors).toHaveLength(0);
  });

  test("/admin still loads", async ({ page }) => {
    const errors = ignoreNoise(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    const url = page.url();
    expect(url.includes("/admin") || url.includes("/dashboard")).toBe(true);
    expect(errors).toHaveLength(0);
  });
});

/**
 * Member / Viewer read-only tests
 *
 * To run these, configure a Playwright project with Member session storageState:
 *
 *   test.use({ storageState: "playwright/.auth/member.json" });
 *
 * Then assert:
 *   - page.getByRole("button", { name: "Departments" }) → not visible
 *   - page.getByRole("button", { name: "Locations" })   → not visible
 *   - page.getByRole("button", { name: "Certifications" }) → not visible
 *   - page.getByRole("button", { name: /add position/i })  → not visible
 *   - Compensation & Budget text                           → not visible
 *   - Successors section                                   → not visible
 *   - page.getByRole("button", { name: "Positions" })   → visible (Members can see this)
 *   - page.getByRole("button", { name: "Reports" })     → visible
 */
