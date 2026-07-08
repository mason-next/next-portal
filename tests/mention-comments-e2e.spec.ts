/**
 * E2E regression test: @mention comments in TaskDrawer and ProjectActivityDrawer.
 *
 * Covers all four comment flows:
 *  A. Normal comment in TaskDrawer
 *  B. @mention comment in TaskDrawer
 *  C. Normal comment in ProjectActivityDrawer
 *  D. @mention comment in ProjectActivityDrawer
 *
 * Captures console errors, network errors, and screenshots on failure.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const LOGIN_URL = `${BASE}/login`;
const PROJECTS_URL = `${BASE}/projects`;
const LOGIN_EMAIL = "jlazo@mason247.com";
const LOGIN_PASSWORD = "password";

// Real project IDs from Railway production database
// Task project: c5a12d8a (has implementation tasks — "Functional Narrative Review")
// Activity drawer test uses the same project
const PROJECT_ID = "c5a12d8a-552d-48b2-b5c4-5db037d6dad8";
const PROJECT_URL = `${BASE}/projects/${PROJECT_ID}`;
const IMPL_URL = `${PROJECT_URL}/implementation`;

const FAB_SELECTOR = 'button[title="Project activity"]';
const PROSEMIRROR = ".ProseMirror";

// ── helpers ───────────────────────────────────────────────────────────────────

async function login(page: Page) {
  // global-setup has already saved a valid session in auth.json (storageState).
  // Navigate directly to /projects — the auth cookie is already set.
  // Fall back to the full login form only if the cookie is missing or expired.
  await page.goto(PROJECTS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/projects/, { timeout: 60000 });
  }
}

function attachErrorCapture(page: Page) {
  const consoleErrors: string[] = [];
  const networkErrors: Array<{ status: number; url: string; body: string }> = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("response", async (res) => {
    if (res.status() >= 400) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 1000);
      } catch {
        /* swallow — can't read body twice */
      }
      networkErrors.push({ status: res.status(), url: res.url(), body });
    }
  });

  return {
    consoleErrors,
    networkErrors,
    /** Filter out noise (fonts, favicon, unrelated aborted requests). */
    realErrors: () =>
      consoleErrors.filter(
        (e) =>
          !e.includes("font") &&
          !e.includes("favicon") &&
          !e.includes("net::ERR_ABORTED") &&
          !e.includes("Failed to load resource")
      ),
    realNetworkErrors: () =>
      networkErrors.filter((e) => !e.url.includes("/favicon") && !e.url.includes("/_next/static")),
  };
}

/** Type text into a ProseMirror editor (the .ProseMirror div). */
async function typeInEditor(page: Page, text: string) {
  const editor = page.locator(PROSEMIRROR).first();
  await editor.click();
  await page.keyboard.type(text);
}

/**
 * Trigger an @mention in the editor: type "@" + prefix, wait for the suggestion
 * dropdown, then press Enter to pick the first match.
 * Returns true if a suggestion was selected, false if the dropdown never appeared.
 */
async function typeMention(page: Page, prefix: string): Promise<boolean> {
  const editor = page.locator(PROSEMIRROR).first();
  await editor.click();
  await page.keyboard.type(`@${prefix}`);

  // The mention popup is appended to <body> as an absolute-positioned div.
  const suggestionAppeared = await page
    .locator("body > div[style*='position: absolute']")
    .first()
    .isVisible({ timeout: 4000 })
    .catch(() => false);

  if (suggestionAppeared) {
    await page.keyboard.press("Enter");
    return true;
  }
  return false;
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe("Comment flows — regression suite", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── A: Normal task comment ───────────────────────────────────────────────────

  test("A. Normal comment in TaskDrawer posts and appears", async ({ page }) => {
    const { realErrors, realNetworkErrors } = attachErrorCapture(page);

    await page.goto(IMPL_URL, { waitUntil: "networkidle", timeout: 60000 });

    // Task title buttons have class "text-left" and flex-1; clicking opens the drawer.
    const taskButton = page.locator("button.text-left").first();
    await taskButton.waitFor({ state: "visible", timeout: 10000 });
    await taskButton.click();

    // Wait for the drawer comment editor to appear.
    const editor = page.locator(PROSEMIRROR).first();
    await editor.waitFor({ state: "visible", timeout: 10000 });

    const uniqueText = `task-normal-${Date.now()}`;
    await typeInEditor(page, uniqueText);

    // Submit via Ctrl+Enter.
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(3000);

    // Comment should appear in the comments section of the drawer.
    // Use waitForFunction to scan the raw DOM text — avoids Playwright's strict visibility
    // heuristics that can mark off-screen feed items as non-visible.
    const appeared = await page
      .waitForFunction(
        (text) => document.body.innerText.includes(text),
        uniqueText,
        { timeout: 11000 }
      )
      .then(() => true)
      .catch(() => false);

    console.log("A — Comment appeared:", appeared);
    console.log("A — Console errors:", realErrors());
    console.log("A — Network errors:", realNetworkErrors());

    expect(realErrors(), "No console errors for normal task comment").toHaveLength(0);
    expect(appeared, "Normal task comment should appear in drawer").toBe(true);
  });

  // ── B: @mention task comment ─────────────────────────────────────────────────

  test("B. @mention comment in TaskDrawer posts without error", async ({ page }) => {
    const { realErrors, realNetworkErrors, consoleErrors } = attachErrorCapture(page);

    await page.goto(IMPL_URL, { waitUntil: "networkidle", timeout: 60000 });

    const taskButton = page.locator("button.text-left").first();
    await taskButton.waitFor({ state: "visible", timeout: 10000 });
    await taskButton.click();

    const editor = page.locator(PROSEMIRROR).first();
    await editor.waitFor({ state: "visible", timeout: 10000 });

    // Try to trigger a mention.
    const mentionSelected = await typeMention(page, "J");
    console.log("B — Mention suggestion appeared and selected:", mentionSelected);

    const uniqueText = `task-mention-${Date.now()}`;
    await page.keyboard.type(` ${uniqueText}`);

    const preErrors = [...consoleErrors];
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(5000);

    const newErrors = consoleErrors.filter((e) => !preErrors.includes(e));
    console.log("B — New console errors after submit:", newErrors);
    console.log("B — All console errors:", realErrors());
    console.log("B — Network errors:", realNetworkErrors());

    const appeared = await page
      .waitForFunction(
        (text) => document.body.innerText.includes(text),
        uniqueText,
        { timeout: 8000 }
      )
      .then(() => true)
      .catch(() => false);
    console.log("B — Comment appeared:", appeared);

    expect(realErrors(), "@mention task comment should produce no console errors").toHaveLength(0);
    expect(appeared, "@mention task comment should appear in drawer").toBe(true);
  });

  // ── C: Normal activity drawer comment ────────────────────────────────────────

  test("C. Normal comment in ActivityDrawer posts and appears", async ({ page }) => {
    const { realErrors, realNetworkErrors } = attachErrorCapture(page);

    await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 60000 });

    const fab = page.locator(FAB_SELECTOR);
    await fab.waitFor({ state: "visible", timeout: 10000 });
    await fab.click();

    const editor = page.locator(PROSEMIRROR).first();
    await editor.waitFor({ state: "visible", timeout: 10000 });

    const uniqueText = `activity-normal-${Date.now()}`;
    await typeInEditor(page, uniqueText);
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(3000);

    const appeared = await page.getByText(uniqueText).isVisible({ timeout: 8000 }).catch(() => false);

    console.log("C — Comment appeared:", appeared);
    console.log("C — Console errors:", realErrors());
    console.log("C — Network errors:", realNetworkErrors());

    expect(realErrors(), "No console errors for normal activity comment").toHaveLength(0);
    expect(appeared, "Normal activity comment should appear in feed").toBe(true);
  });

  // ── D: @mention activity drawer comment ──────────────────────────────────────

  test("D. @mention comment in ActivityDrawer posts without error", async ({ page }) => {
    const { realErrors, realNetworkErrors, consoleErrors } = attachErrorCapture(page);

    await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 60000 });

    const fab = page.locator(FAB_SELECTOR);
    await fab.waitFor({ state: "visible", timeout: 10000 });
    await fab.click();

    const editor = page.locator(PROSEMIRROR).first();
    await editor.waitFor({ state: "visible", timeout: 10000 });

    const mentionSelected = await typeMention(page, "J");
    console.log("D — Mention suggestion appeared and selected:", mentionSelected);

    const uniqueText = `activity-mention-${Date.now()}`;
    await page.keyboard.type(` ${uniqueText}`);

    const preErrors = [...consoleErrors];
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(5000);

    const newErrors = consoleErrors.filter((e) => !preErrors.includes(e));
    console.log("D — New console errors after submit:", newErrors);
    console.log("D — All console errors:", realErrors());
    console.log("D — Network errors:", realNetworkErrors());

    const appeared = await page.getByText(uniqueText).isVisible({ timeout: 8000 }).catch(() => false);
    console.log("D — Comment appeared:", appeared);

    expect(realErrors(), "@mention activity comment should produce no console errors").toHaveLength(0);
    expect(appeared, "@mention activity comment should appear in feed").toBe(true);
  });

  // ── E: Page reload after @mention comment ────────────────────────────────────

  test("E. Page reload after @mention activity comment shows no 'Server Components render' error", async ({ page }) => {
    const { realErrors } = attachErrorCapture(page);

    await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 60000 });

    const fab = page.locator(FAB_SELECTOR);
    await fab.waitFor({ state: "visible", timeout: 10000 });
    await fab.click();

    const editor = page.locator(PROSEMIRROR).first();
    await editor.waitFor({ state: "visible", timeout: 10000 });

    await typeMention(page, "J");
    const uniqueText = `reload-mention-${Date.now()}`;
    await page.keyboard.type(` ${uniqueText}`);
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(3000);

    // Reload the page and reopen the drawer.
    await page.reload({ waitUntil: "networkidle" });
    const fab2 = page.locator(FAB_SELECTOR);
    await fab2.waitFor({ state: "visible", timeout: 10000 });
    await fab2.click();

    // Check for the infamous "Server Components render" error.
    const serverComponentsError = await page
      .getByText(/server components render/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    console.log("E — 'Server Components render' error visible:", serverComponentsError);
    console.log("E — Console errors after reload:", realErrors());

    const commentPersisted = await page
      .getByText(uniqueText)
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    console.log("E — Comment persisted after reload:", commentPersisted);

    expect(serverComponentsError, "Must not show 'Server Components render' error after reload").toBe(false);
    expect(realErrors(), "No console errors after reload").toHaveLength(0);
    expect(commentPersisted, "Comment persists after page reload").toBe(true);
  });
});
