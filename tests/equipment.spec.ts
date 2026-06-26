import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const EQUIPMENT_URL = `${BASE}/projects/proj-iat-anaheim/procurement/equipment-tracking`;

// Waits for the table to be visible (populated state).
async function waitForTable(page: import("@playwright/test").Page) {
  await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
}

// If the page shows the empty-state dropzone, import the sample data and confirm the modal.
async function ensureRowsLoaded(page: import("@playwright/test").Page) {
  const isEmptyState = await page
    .getByRole("button", { name: "Use Sample Equipment List" })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (isEmptyState) {
    await page.getByRole("button", { name: "Use Sample Equipment List" }).click();
    // Import modal appears — confirm with the "Load Equipment List" button
    await page.getByRole("button", { name: "Load Equipment List" }).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Load Equipment List" }).click();
    // Give the server action time to write all rows to DB
    await page.waitForTimeout(3000);
  }

  await waitForTable(page);
}

test.describe("Equipment Tracking — PostgreSQL migration", () => {
  test("1. equipment page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    // Page either shows the table or the import dropzone — both are valid loaded states
    const hasTable = await page.locator("table").isVisible({ timeout: 5000 }).catch(() => false);
    const hasDropzone = await page.getByRole("button", { name: "Use Sample Equipment List" }).isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTable || hasDropzone).toBe(true);

    const realErrors = errors.filter((e) => !e.includes("font") && !e.includes("favicon"));
    expect(realErrors).toHaveLength(0);
  });

  test("2. CSV import (sample) creates rows in DB", async ({ page }) => {
    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // At least one data row should be visible
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("3. equipment rows persist after page reload", async ({ page }) => {
    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // Capture text from the first row's manufacturer input to use as a reference
    const firstInput = page.locator("table tbody tr:first-child input").first();
    const firstValue = await firstInput.inputValue();

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    // Same value should still be there from DB
    const firstInputAfter = page.locator("table tbody tr:first-child input").first();
    await expect(firstInputAfter).toHaveValue(firstValue);
  });

  test("4. editing a numeric field persists after reload", async ({ page }) => {
    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // qty is the only input[type="number"] visible in a row (unitCost is hidden by default)
    const qtyInput = page.locator("table tbody tr:first-child input[type='number']").first();
    const originalQty = await qtyInput.inputValue();
    const newQty = originalQty === "42" ? "43" : "42";

    await qtyInput.click();
    await qtyInput.fill(newQty);
    // Number inputs commit on every change — allow server action to complete before reload
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    const qtyAfter = page.locator("table tbody tr:first-child input[type='number']").first();
    await expect(qtyAfter).toHaveValue(newQty);
  });

  test("5. upload history persists after reload", async ({ page }) => {
    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    // Open upload history modal
    await page.getByRole("button", { name: "Upload History" }).click();
    await expect(page.getByRole("heading", { name: "Upload History" })).toBeVisible({ timeout: 5000 });

    // At least one upload record should be present (from test 2 or previous runs)
    const hasRecord = await page.locator("text=Sample Equipment List").isVisible({ timeout: 3000 }).catch(() => false);
    const hasAnyRecord = hasRecord || (await page.locator("text=.csv").count()) > 0;
    expect(hasAnyRecord).toBe(true);

    await page.getByRole("button", { name: "Done" }).click();

    // Reload and re-check
    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);
    await page.getByRole("button", { name: "Upload History" }).click();
    await expect(page.getByRole("heading", { name: "Upload History" })).toBeVisible({ timeout: 5000 });

    // "No uploads yet." should NOT be shown
    await expect(page.getByText("No uploads yet.")).not.toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
  });

  test("6. clearing localStorage does not remove DB-backed rows", async ({ page }) => {
    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await ensureRowsLoaded(page);

    const rowsBefore = await page.locator("table tbody tr").count();
    expect(rowsBefore).toBeGreaterThan(0);

    // Wipe all localStorage (simulates clearing cache or using a fresh browser)
    await page.evaluate(() => localStorage.clear());

    await page.reload({ waitUntil: "networkidle" });
    await waitForTable(page);

    // Rows must still be there — they live in Postgres, not localStorage
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore);
  });

  test("7. no console errors on equipment page after migration", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(EQUIPMENT_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open upload history briefly to exercise that path
    const hasTable = await page.locator("table").isVisible({ timeout: 3000 }).catch(() => false);
    if (hasTable) {
      await page.getByRole("button", { name: "Upload History" }).click();
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: "Done" }).click();
    }

    const realErrors = errors.filter(
      (e) =>
        !e.includes("font") &&
        !e.includes("favicon") &&
        !e.includes("net::ERR_ABORTED")
    );
    expect(realErrors).toHaveLength(0);
  });
});
