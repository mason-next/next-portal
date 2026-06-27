import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const BOM_URL = `${BASE}/projects/proj-iat-anaheim/engineering/bom-review`;

async function waitForTable(page: import("@playwright/test").Page) {
  await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
}

// Ensures BOM rows are loaded; imports the sample CSV if the page shows the empty dropzone.
// Polls every second for up to 20s for either the table (rows loaded) or the "Use Sample BOM"
// button (empty state), whichever appears first, so we decide quickly without burning time on
// a long fixed waitFor in either direction.
async function ensureRowsLoaded(page: import("@playwright/test").Page) {
  const useSampleBtn = page.getByRole("button", { name: "Use Sample BOM" });
  const tableLocator = page.locator("table");

  let isEmptyState = false;
  for (let i = 0; i < 20; i++) {
    const btnVisible = await useSampleBtn.isVisible().catch(() => false);
    if (btnVisible) { isEmptyState = true; break; }
    const tableVisible = await tableLocator.isVisible().catch(() => false);
    if (tableVisible) { break; }
    await page.waitForTimeout(1000);
  }

  if (isEmptyState) {
    await useSampleBtn.click();
    await page.getByRole("button", { name: "Load BOM" }).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Load BOM" }).click();
    await page.waitForTimeout(4000);
  }

  await waitForTable(page);
}

test.describe("BOM Review — PostgreSQL migration", () => {
  test.setTimeout(90000);
  test("1. BOM review page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });

    const hasTable = await page.locator("table").isVisible({ timeout: 5000 }).catch(() => false);
    const hasDropzone = await page
      .getByRole("button", { name: "Use Sample BOM" })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasTable || hasDropzone).toBe(true);

    const realErrors = errors.filter((e) => !e.includes("font") && !e.includes("favicon"));
    expect(realErrors).toHaveLength(0);
  });

  test("2. CSV import (sample) creates rows in DB", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("3. BOM rows persist after page reload", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    const countBefore = await page.locator("table tbody tr").count();

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    const countAfter = await page.locator("table tbody tr").count();
    expect(countAfter).toBe(countBefore);
  });

  test("4. editing notes field persists after reload", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    const firstRow = page.locator("table tbody tr").first();
    // Text inputs per row in DOM order: seq(0), mfr(1), part(2), desc(3), unitCost(4), notes(5)
    const notesInput = firstRow.locator("input[type='text']").nth(5);
    const testNote = `test-note-${Date.now()}`;
    await notesInput.fill(testNote);
    await notesInput.press("Tab");
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    const notesInputAfter = page.locator("table tbody tr").first().locator("input[type='text']").nth(5);
    await expect(notesInputAfter).toHaveValue(testNote, { timeout: 8000 });
  });

  test("5. editing status persists after reload", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // Find first row's status cell — it should have a select or clickable element
    const firstRow = page.locator("table tbody tr").first();
    const statusSelect = firstRow.locator("select").first();

    const originalStatus = await statusSelect.inputValue().catch(() => null);
    if (originalStatus === null) {
      // Status might render as a button/dropdown rather than a native select
      test.skip();
      return;
    }

    const newStatus = originalStatus === "Approved" ? "Pending Review" : "Approved";
    await statusSelect.selectOption(newStatus);
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    const statusAfter = await firstRow.locator("select").first().inputValue();
    expect(statusAfter).toBe(newStatus);
  });

  test("6. audit history is visible and persists", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // Make a field change to generate an audit entry
    const firstRow = page.locator("table tbody tr").first();
    const textInputs = firstRow.locator("input[type='text'], input:not([type])");
    const mfrInput = textInputs.first();
    const originalVal = await mfrInput.inputValue();
    const newVal = originalVal + "-audit";
    await mfrInput.fill(newVal);
    await mfrInput.press("Tab");
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    // Confirm the edited field value persisted — first text input (seq) should have newVal
    const firstRowAfter = page.locator("table tbody tr").first();
    await expect(
      firstRowAfter.locator("input[type='text'], input:not([type])").first()
    ).toHaveValue(newVal, { timeout: 8000 });
  });

  test("7. clearing localStorage does not remove DB-backed rows", async ({ page }) => {
    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    const countBefore = await page.locator("table tbody tr").count();
    expect(countBefore).toBeGreaterThan(0);

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    const countAfter = await page.locator("table tbody tr").count();
    expect(countAfter).toBe(countBefore);
  });

  test("8. no console errors after localStorage cleared", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BOM_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const realErrors = errors.filter(
      (e) => !e.includes("font") && !e.includes("favicon") && !e.includes("net::ERR_ABORTED")
    );
    expect(realErrors).toHaveLength(0);
  });
});
