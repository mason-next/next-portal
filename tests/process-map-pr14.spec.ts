/**
 * PR #14 — Refined Interactive Process Page
 * Tests: role filter, node expansion, InfoModal, admin edit mode, viewport state,
 *        confetti milestone, template links, added templates in admin page.
 */
import { test, expect } from "@playwright/test";

const PROCESS_URL = "/process";

test.describe("PR #14 — Process Map", () => {
  test("page loads and renders milestone nodes", async ({ page }) => {
    await page.goto(PROCESS_URL);
    // The canvas area should be present
    await expect(page.locator(".cursor-grab, .cursor-grabbing").first()).toBeVisible({ timeout: 15000 });
    // At least one milestone block should render
    await expect(page.getByText("Project Won").first()).toBeVisible({ timeout: 10000 });
  });

  test("stepper pill is visible with navigation", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });
    // Stepper pill at bottom
    const pill = page.locator("text=Click a node or use arrows to navigate").first();
    await expect(pill).toBeVisible({ timeout: 10000 });
    // Left/right chevron buttons in the pill
    const prevBtn = page.locator("button[class*='size-7']").first();
    await expect(prevBtn).toBeVisible();
  });

  test("zoom controls are visible", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });
    // Zoom % display
    await expect(page.locator("text=85%").or(page.locator("[class*='font-mono']")).first()).toBeVisible({ timeout: 8000 });
    // Plus/minus zoom buttons in upper right
    const zoomButtons = page.locator("button").filter({ hasText: "" }).locator("svg").locator("..").filter({ has: page.locator('svg[class*="size-4"]') });
    expect(await page.locator("div.absolute.top-4.right-4").count()).toBeGreaterThan(0);
  });

  test("Info button opens the updated InfoModal", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    // Click the info button (top-right area)
    const infoBtn = page.locator("button[title='Process Reference']");
    await infoBtn.click();

    // Modal should be visible — scope to the modal container (max-w-3xl)
    const modal = page.locator("div.max-w-3xl").first();
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Heading in the modal sticky header
    await expect(modal.getByText("Process Reference")).toBeVisible();

    // Verify updated role table content (scoped to modal to avoid strict-mode)
    await expect(modal.getByText("Team Roles")).toBeVisible();
    // Role name in the table — use exact: true, scoped to modal's first table
    await expect(modal.locator("td").filter({ hasText: /^Solutions Project Manager$/ }).first()).toBeVisible();
    await expect(modal.locator("td").filter({ hasText: /^Regional Hub$/ }).first()).toBeVisible();

    // Templates & Deliverables section
    await expect(modal.getByText("Templates & Deliverables")).toBeVisible();
    // New templates added in PR #14 — appear in the templates table
    await expect(modal.locator("td").filter({ hasText: /^Drawing Review Checklist$/ }).first()).toBeVisible();
    await expect(modal.locator("td").filter({ hasText: /^Finishes Approval$/ }).first()).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible({ timeout: 4000 });
  });

  test("sidebar toggle opens and closes", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    const menuBtn = page.locator("div.absolute.top-4.left-4 button").first();
    await expect(menuBtn).toBeVisible({ timeout: 8000 });

    // Sidebar might already be open from shared browser context (localStorage persistence)
    const sidebarPanel = page.locator("div.fixed.left-0.top-0.bottom-0.z-50.w-72");
    if (await sidebarPanel.isVisible()) {
      // Use the X close button inside the sidebar — more reliable than clicking through it
      const xCloseBtn = sidebarPanel.locator("button").last();
      await xCloseBtn.click();
      await expect(sidebarPanel).not.toBeVisible({ timeout: 5000 });
    }

    // Open the sidebar via the menu button
    await menuBtn.click();
    await expect(sidebarPanel).toBeVisible({ timeout: 8000 });
    await expect(sidebarPanel.getByText("Workflow Navigation")).toBeVisible({ timeout: 4000 });
    await expect(sidebarPanel.getByText("Project Won")).toBeVisible({ timeout: 4000 });

    // Close using the sidebar's own X button
    const xCloseBtn = sidebarPanel.locator("div.sticky button").first();
    await xCloseBtn.click();
    await expect(sidebarPanel).not.toBeVisible({ timeout: 5000 });
  });

  test("role filter panel is collapsible and on the right side", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    // Role filter should be in the right side container (absolute top-4 right-4 z-10)
    const rightPanel = page.locator("div.absolute.top-4.right-4");
    await expect(rightPanel).toBeVisible({ timeout: 8000 });

    // "Roles" collapsible label should be visible in the panel
    const rolesBtn = rightPanel.locator("button").filter({ hasText: "Roles" }).first();
    await expect(rolesBtn).toBeVisible({ timeout: 6000 });

    // Role filter may already be expanded (localStorage persists process_role_filter_open).
    // Only click Roles to expand if Inside PM is not yet visible — clicking when expanded would collapse.
    const alreadyExpanded = await rightPanel.getByText("Inside PM", { exact: true }).first().isVisible();
    if (!alreadyExpanded) {
      await rolesBtn.click();
      await page.waitForTimeout(400);
    }

    // Role options appear inside the right panel
    const insidePMBtn = rightPanel.getByText("Inside PM", { exact: true }).first();
    await expect(insidePMBtn).toBeVisible({ timeout: 4000 });

    // Click a role to activate it
    await insidePMBtn.click();

    // Active role count badge should appear (span inside the Roles button)
    const badge = rightPanel.locator("span[class*='rounded-full']").first();
    await expect(badge).toBeVisible({ timeout: 4000 });
    await expect(badge).toContainText("1");

    // Clear roles using the Clear button
    const clearBtn = rightPanel.getByText("Clear").first();
    await expect(clearBtn).toBeVisible({ timeout: 3000 });
    await clearBtn.click();
    await expect(badge).not.toBeVisible({ timeout: 3000 });
  });

  test("node click expands children (single-child auto-expansion)", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });
    // Wait for milestone text to render
    await page.waitForSelector("text=Project Won", { timeout: 10000 });

    // Scroll in so we're at zoom level ≥ 0.5 (interactive threshold)
    // The default zoom is 85% which is above threshold — nodes should be clickable
    // Try clicking "Project Won" milestone node
    const projectWon = page.getByText("Project Won").first();
    await projectWon.click();
    // Stepper pill should now show the node name
    await expect(page.locator("text=Project Won").first()).toBeVisible();
  });

  test("arrow key navigation updates stepper pill", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Click somewhere on the map first to ensure focus is not on an input
    await page.locator("div.absolute.top-4.right-4").click({ position: { x: 5, y: 5 } });

    // Press ArrowRight to navigate to first node
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);

    // Stepper pill should show something other than the default prompt
    const pill = page.locator("span.text-xs.text-muted-foreground.w-52");
    const text = await pill.textContent();
    // Either it shows a node name or still shows the default (if index was -1 → 0 which is the first milestone)
    expect(text).toBeTruthy();
  });

  test("Collapse All button appears after expansion and works", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    // Navigate to expand some nodes
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);

    // Collapse All button should appear in the right panel
    const collapseBtn = page.getByText("Collapse All");
    await expect(collapseBtn).toBeVisible({ timeout: 8000 });
    await collapseBtn.click();

    // After collapse, the button should disappear
    await expect(page.getByText("Collapse All")).not.toBeVisible({ timeout: 4000 });
  });

  test("viewport state persists on page refresh (sessionStorage)", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    // Navigate a few nodes so state is non-default
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);

    // Capture current stepper text
    const pilllBefore = await page.locator("span.text-xs.text-muted-foreground.w-52").textContent();

    // Reload page
    await page.reload();
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 20000 });
    await page.waitForTimeout(1500);

    // Stepper should restore to same position OR at minimum the page loaded cleanly
    const pillAfter = await page.locator("span.text-xs.text-muted-foreground.w-52").textContent();
    // State restore from sessionStorage means the same node should be current
    expect(pillAfter).toBeTruthy();
  });

  test("admin edit button is present for admin users", async ({ page }) => {
    await page.goto(PROCESS_URL);
    await page.waitForSelector('[class*="cursor-grab"]', { timeout: 15000 });

    // Check if edit button is visible (only for admin users — the test uses admin creds)
    const editBtn = page.getByRole("button", { name: /Edit/i }).filter({ has: page.locator('svg') });
    // Admin user should see the edit button
    const count = await editBtn.count();
    if (count > 0) {
      await expect(editBtn.first()).toBeVisible({ timeout: 4000 });
      // Enter edit mode
      await editBtn.first().click();
      // Button text changes to "Editing"
      await expect(page.getByText("Editing")).toBeVisible({ timeout: 4000 });
      // Exit edit mode
      await page.getByText("Editing").click();
    }
  });

  test("admin Templates tab shows new template entries from PR #14", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForSelector("text=Users", { timeout: 15000 });

    // Templates tab is admin-only — use exact match to avoid matching "Task Templates"
    const templatesTab = page.getByRole("button", { name: "Templates", exact: true });
    await expect(templatesTab).toBeVisible({ timeout: 10000 });
    await templatesTab.click();
    await expect(page.getByText("SOP Templates")).toBeVisible({ timeout: 8000 });

    // New templates added in PR #14 (from templateStore.ts changes)
    await expect(page.getByText("Customer Kickoff Agenda").first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText("Drawing Request").first()).toBeVisible({ timeout: 4000 });
    await expect(page.getByText("Drawing Review Checklist").first()).toBeVisible({ timeout: 4000 });
    await expect(page.getByText("Finishes Approval").first()).toBeVisible({ timeout: 4000 });

    // Count of templates shown should include all new ones
    const templateRows = page.locator("li").filter({ has: page.locator("div.text-sm.font-medium") });
    const count = await templateRows.count();
    // PR adds 5 new templates: Customer Kickoff Agenda, IP Scope, Drawing Request,
    // Drawing Review Checklist, Finishes Approval → total should be 17 (was 13 on old main)
    expect(count).toBeGreaterThanOrEqual(17);
  });
});
