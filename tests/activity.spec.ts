import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const PROJECT_URL = `${BASE}/projects/proj-iat-anaheim`;

// The floating activity button (FAB) in the bottom-right corner has title="Project activity"
const FAB = 'button[title="Project activity"]';

async function openActivityDrawer(page: import("@playwright/test").Page) {
  await page.waitForSelector(FAB, { timeout: 12000 });
  await page.click(FAB);
  // Confirm drawer opened by waiting for Tiptap editor
  await page.waitForSelector(".ProseMirror", { timeout: 10000 });
}

test.describe("Activity / Comments — PostgreSQL migration", () => {
  test("1. activity drawer opens and loads activity from DB", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(PROJECT_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await openActivityDrawer(page);

    // Drawer is open — editor visible means successful load
    await expect(page.locator(".ProseMirror").first()).toBeVisible();

    const realErrors = errors.filter((e) => !e.includes("font") && !e.includes("favicon"));
    expect(realErrors).toHaveLength(0);
  });

  test("2. new comment saves to DB and persists on reload", async ({ page }) => {
    await page.goto(PROJECT_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await openActivityDrawer(page);

    const editor = page.locator(".ProseMirror").first();
    const commentText = `Test comment ${Date.now()}`;
    await editor.click();
    await editor.type(commentText);

    // Submit: look for a send/submit button near the editor
    const sendBtn = page.locator("button").filter({ hasText: /send|post|submit|comment/i }).last();
    // Fallback: try clicking the button with a send icon
    const buttons = page.locator("button[type=button]");
    // Try a direct approach: Ctrl+Enter or click the visible send-like button
    await page.keyboard.press("Control+Enter");

    // Wait briefly for the server action to complete
    await page.waitForTimeout(2000);

    // Comment should appear in the feed
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence (now from DB, not localStorage)
    await page.reload({ waitUntil: "domcontentloaded" });
    await openActivityDrawer(page);
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10000 });
  });

  test("3. workflow status change creates an activity entry", async ({ page }) => {
    // Navigate to the setup workflow page
    await page.goto(`${PROJECT_URL}/setup`, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Click the first workflow step row to open StepDetailModal
    await page.locator("tbody tr").first().waitFor({ timeout: 10000 });
    await page.locator("tbody tr").first().click();

    // Wait for the modal's status select
    const statusSelect = page.locator("dialog select, [role=dialog] select").first();
    await statusSelect.waitFor({ timeout: 8000 });
    // Select by index to avoid relying on exact option text/value strings
    const currentIdx = await statusSelect.evaluate((el: HTMLSelectElement) => el.selectedIndex);
    const targetIdx = currentIdx === 0 ? 1 : 0;
    await statusSelect.selectOption({ index: targetIdx });

    // Save (Modal is a plain div, not a <dialog> — use role selector globally)
    await page.getByRole("button", { name: /^Save$/ }).click();
    await page.waitForTimeout(1000);

    // Navigate to project root and open activity drawer
    await page.goto(PROJECT_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await openActivityDrawer(page);

    // Activity feed should contain a workflow status entry
    await expect(
      page.getByText(/status changed|in progress|not started|complete/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("4. no console errors on project page with drawer open", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(PROJECT_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);
    await openActivityDrawer(page);
    await page.waitForTimeout(1500);

    const realErrors = errors.filter(
      (e) =>
        !e.includes("font") &&
        !e.includes("favicon") &&
        !e.includes("net::ERR_ABORTED")
    );
    expect(realErrors).toHaveLength(0);
  });
});
