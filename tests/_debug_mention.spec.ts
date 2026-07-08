import { test, expect } from "@playwright/test";

const PROJECT_ID = "c5a12d8a-552d-48b2-b5c4-5db037d6dad8";
const PROJECT_URL = `http://localhost:3000/projects/${PROJECT_ID}`;
const LOGIN_EMAIL = "jlazo@mason247.com";
const LOGIN_PASSWORD = "password";

async function login(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects/, { timeout: 30000 });
}

test("@mention debug — capture all console errors and test full flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleWarns: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
    if (msg.type() === "warning") consoleWarns.push(msg.text());
  });

  page.on("response", async (res) => {
    if (res.status() >= 400) {
      let body = "";
      try { body = (await res.text()).substring(0, 2000); } catch { /* ignore */ }
      networkErrors.push(`${res.status()} ${res.url()}\nBODY: ${body}`);
    }
  });

  // 0. Login
  console.log("Step 0: Logging in…");
  await login(page);
  console.log("Logged in. URL:", page.url());

  // 1. Navigate to project
  console.log("Step 1: Navigating to project…");
  await page.goto(PROJECT_URL, { waitUntil: "networkidle", timeout: 30000 });
  console.log("Page loaded. URL:", page.url());
  console.log("Console errors after load:", consoleErrors);

  // 2. Open activity drawer
  console.log("Step 2: Opening activity drawer…");
  const fab = page.locator('button[title="Project activity"]');
  await expect(fab).toBeVisible({ timeout: 10000 });
  await fab.click();

  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible({ timeout: 10000 });
  console.log("Activity drawer open. Console errors so far:", consoleErrors);

  // 3. Click editor and type @
  console.log("Step 3: Typing @ in editor…");
  await editor.click();
  await page.waitForTimeout(500);
  await page.keyboard.type("@");
  await page.waitForTimeout(1000);

  // Look for suggestion popup — our implementation appends a div to body
  const bodyChildren = await page.evaluate(() => {
    const divs = [...document.body.querySelectorAll<HTMLElement>("div[style*='position: absolute']")];
    return divs.map(d => ({
      visible: d.offsetParent !== null,
      innerHTML: d.innerHTML.substring(0, 300),
      style: d.getAttribute("style"),
    }));
  });
  console.log("Absolute-positioned divs in body:", JSON.stringify(bodyChildren, null, 2));
  console.log("Console errors after typing @:", consoleErrors);

  // 4. Type a letter to filter
  await page.keyboard.type("J");
  await page.waitForTimeout(1000);

  const bodyChildrenAfterJ = await page.evaluate(() => {
    const divs = [...document.body.querySelectorAll<HTMLElement>("div[style*='position: absolute']")];
    return divs.map(d => ({
      visible: d.offsetParent !== null,
      innerHTML: d.innerHTML.substring(0, 300),
    }));
  });
  console.log("Absolute divs after typing J:", JSON.stringify(bodyChildrenAfterJ, null, 2));

  // 5. Check if any mention-related elements are visible
  const mentionList = page.locator('[role="listbox"]').first();
  const listVisible = await mentionList.isVisible().catch(() => false);
  console.log("Mention listbox visible:", listVisible);

  if (listVisible) {
    console.log("SUCCESS: Mention dropdown is showing!");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
  } else {
    console.log("FAIL: Mention dropdown NOT showing. Checking why…");

    // Check Tiptap mention extension is configured
    const mentionConfig = await page.evaluate(() => {
      // Check for ProseMirror mention plugin
      const pm = (window as unknown as Record<string, unknown>).__tiptap_debug;
      return { pm };
    });
    console.log("Tiptap debug:", mentionConfig);
  }

  // 6. Type unique text and submit
  const uniqueText = `debug-mention-${Date.now()}`;
  await page.keyboard.type(` ${uniqueText}`);

  console.log("Step 4: Submitting comment (Ctrl+Enter)…");
  const preSubmitErrors = [...consoleErrors];
  const preSubmitNetworkErrors = [...networkErrors];
  await page.keyboard.press("Control+Enter");
  // Wait 10s so at least one 6-second poll cycle completes — lets us distinguish
  // a single submit-500 from recurring poll-500s caused by stored richContent
  await page.waitForTimeout(10000);

  console.log("New console errors after submit:", consoleErrors.filter(e => !preSubmitErrors.includes(e)));
  console.log("All console errors:", consoleErrors);
  console.log("Network errors:", networkErrors);

  // 7. Check if the comment appeared
  const commentVisible = await page.getByText(uniqueText).isVisible({ timeout: 5000 }).catch(() => false);
  console.log("Comment appeared in feed:", commentVisible);

  // Fail with details if there were errors
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("font") && !e.includes("favicon") && !e.includes("net::ERR_ABORTED")
  );

  if (realErrors.length > 0) {
    throw new Error(`Console errors found:\n${realErrors.join("\n")}`);
  }

  expect(commentVisible, "Comment should appear in feed after submit").toBe(true);
});
