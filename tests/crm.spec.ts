import { test, expect } from "@playwright/test";

// Runs against the CRM demo data: `npx tsx scripts/seed-crm-demo.ts --reset` first.
// Uses the admin session from global-setup (Juan Lazo → Administrator via the demo script).

const BASE = "http://localhost:3000";
const HARBOR = `${BASE}/sales/accounts/demo_harbor`;

test.describe("Sales CRM", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto(HARBOR, { waitUntil: "networkidle" });
    test.skip(!res || !(await page.getByRole("heading", { name: "Harbor Health System" }).count()),
      "CRM demo data not loaded — run scripts/seed-crm-demo.ts");
  });

  test("CRM pages render", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [path, heading] of [
      ["/sales", "Sales Dashboard"],
      ["/sales/agenda", "Agenda"],
      ["/sales/accounts", "Accounts"],
      ["/sales/opportunities", "Opportunities"],
      ["/sales/leads", "Leads"],
    ]) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
    expect(errors).toHaveLength(0);
  });

  test("dated opportunity note appears in the account timeline and filters by scope", async ({ page }) => {
    const text = `Spec note ${Date.now()}`;
    await page.getByLabel("Note text").fill(text);
    await page.locator('input[type="date"]').first().fill("2026-01-15");
    const composer = page.locator("form").filter({ has: page.getByLabel("Note text") });
    await composer.locator("select").nth(1).selectOption({ label: "Opp: Nurse-call integration" });
    await page.getByRole("button", { name: "Add note" }).click();

    const entry = page.locator("li").filter({ hasText: text });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText("Jan 15");
    await expect(entry).toContainText("Opp · Nurse-call integration");

    await page.getByLabel("Filter by scope").selectOption("company");
    await expect(page.getByText(text)).toHaveCount(0);
  });

  test("moving a deal to Proposal creates the automated task", async ({ page }) => {
    const stage = page.getByLabel("Stage for Nurse-call integration", { exact: true });
    const current = await stage.inputValue();
    test.skip(current !== "Qualifying", "not in Qualifying — reset the demo data");
    await stage.selectOption("Proposal");
    await expect(page.getByText("Follow up on proposal").first()).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Show change history").check();
    await expect(page.getByText(/moved opportunity Nurse-call integration from Qualifying → Proposal/)).toBeVisible();
  });

  test("a task due sooner becomes the deal's next task", async ({ page }) => {
    const title = `Spec task ${Date.now()}`;
    await page.getByTitle("Add task").first().click();
    await page.getByLabel("Task title").first().fill(title);
    await page.locator('input[aria-label="Due date"]').first().fill("2026-01-02");
    await page.getByLabel("Opportunity").first().selectOption({ label: "Clinic Wi-Fi 6E refresh (12 sites)" });
    await page.getByRole("button", { name: "Add task" }).first().click();
    const row = page.locator("tr").filter({ hasText: "Clinic Wi-Fi 6E refresh (12 sites)" });
    await expect(row).toContainText(title);
  });

  test("clicking an agenda task opens its account with the task highlighted", async ({ page }) => {
    await page.goto(`${BASE}/sales/agenda`, { waitUntil: "networkidle" });
    await page.getByLabel("Whose agenda").selectOption("all");
    await page.getByText("Review MSA redlines with legal").first().click();
    await page.waitForURL(/\/sales\/accounts\/demo_vantage\?.*task=demo_t4/);
    const task = page.locator('[data-focus="task-demo_t4"]:visible');
    await expect(task).toContainText("Review MSA redlines with legal");
    await expect(task).toHaveClass(/ring-amber-400/);
  });

  test("opportunities list groups by territory with subtotals", async ({ page }) => {
    await page.goto(`${BASE}/sales/opportunities`, { waitUntil: "networkidle" });
    await page.getByLabel("Group by").selectOption("territory");
    await expect(page.getByRole("cell", { name: /^Southeast/ })).toBeVisible();
  });
});
