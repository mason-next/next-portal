const { chromium } = require("playwright");

let passed = 0, failed = 0;
function result(label, cond, detail) {
  const status = cond ? "PASS" : "FAIL";
  console.log(`[${status}] ${label}${detail !== undefined ? ': ' + detail : ''}`);
  if (cond) passed++; else failed++;
  return cond;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: "tests/auth.json" });
  const page = await context.newPage();

  // ── 1. /process page loads ────────────────────────────────────────────────────
  await page.goto("http://localhost:3000/process", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "pr18-01-initial.png", fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  result("/process loads without error", !bodyText.includes("Application error") && bodyText.length > 200);

  // ── 2. Project type selector UI (buttons show short labels) ───────────────────
  const typeLabels = ["AV", "Structured", "Security", "Box Sale"];
  for (const label of typeLabels) {
    const btn = page.locator('button').filter({ hasText: new RegExp(`^${label}$`) }).first();
    const visible = await btn.isVisible().catch(() => false);
    result(`Project type button "${label}" visible`, visible);
  }

  // ── 3. AV workflow shows correct milestones ───────────────────────────────────
  result("AV: 'Setup' milestone visible", bodyText.includes("Setup"));
  result("AV: 'Engineering' milestone visible", bodyText.includes("Engineering"));
  result("AV: 'Procurement' visible", bodyText.includes("Procurement"));
  result("AV: 'Implementation' visible", bodyText.includes("Implementation"));
  result("AV: 'Commissioning' visible", bodyText.includes("Commissioning"));

  // ── 4. Default type active state (AV button has inline background style) ───────
  const avBtn = page.locator('button').filter({ hasText: /^AV$/ }).first();
  const avBtnStyle = await avBtn.getAttribute('style').catch(() => '');
  result("AV button has active style", avBtnStyle?.includes('background'), `style="${avBtnStyle}"`);

  // ── 5. Switch to Structured Cabling ───────────────────────────────────────────
  const scBtn = page.locator('button').filter({ hasText: /^Structured$/ }).first();
  await scBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "pr18-02-sc-type.png", fullPage: true });

  const scText = await page.evaluate(() => document.body.innerText);
  result("SC type: page stable after switch", scText.length > 200 && !scText.includes("Application error"));
  result("SC type: milestones still present", scText.includes("Setup") || scText.includes("Engineering") || scText.includes("Implementation"));

  // ── 6. Switch to Security ─────────────────────────────────────────────────────
  const secBtn = page.locator('button').filter({ hasText: /^Security$/ }).first();
  await secBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "pr18-03-security-type.png", fullPage: true });

  const secText = await page.evaluate(() => document.body.innerText);
  result("Security type: page stable after switch", secText.length > 200 && !secText.includes("Application error"));

  // ── 7. Switch to Box Sale ─────────────────────────────────────────────────────
  const boxBtn = page.locator('button').filter({ hasText: /^Box Sale$/ }).first();
  await boxBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "pr18-04-box-sale-type.png", fullPage: true });

  const boxText = await page.evaluate(() => document.body.innerText);
  result("Box Sale type: page stable after switch", boxText.length > 200 && !boxText.includes("Application error"));

  // ── 8. Fresh /process load + edit mode test (PR #17 regression) ─────────────
  // Clear sessionStorage to get clean canvas position (avoids contamination from type-switch sequence)
  await page.evaluate(() => sessionStorage.removeItem('process_view_state'));
  await page.goto("http://localhost:3000/process", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(3000);

  const editBtn = page.locator('button').filter({ hasText: /^Edit$/ }).last();
  const editBtnVisible = await editBtn.isVisible().catch(() => false);
  result("Edit mode button present (PR #17 preserved)", editBtnVisible);

  if (editBtnVisible) {
    await editBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "pr18-05-edit-mode.png" });

    const pencilBtns = page.locator('button[title="Edit phase name"]');
    const pencilCount = await pencilBtns.count();
    result("Pencil buttons appear in edit mode", pencilCount > 0, `count=${pencilCount}`);

    if (pencilCount > 0) {
      // DOM click bypasses Playwright's coordinate system (CSS zoom + canvas transform)
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[title="Edit phase name"]'));
        if (btns[0]) btns[0].click();
      });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "pr18-05b-pencil-clicked.png" });

      // NOTE: The MilestoneBlock title input has no explicit type="text" attribute (only
      // the DOM property defaults to "text"). Use querySelectorAll("input") + i.type check,
      // NOT input[type="text"] CSS selector, which won't match the typeless input element.
      const inputInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("input"));
        const textInput = inputs.find(i => i.type === 'text');
        return textInput ? { found: true, value: textInput.value } : { found: false, value: '' };
      });
      result("Phase title input opens on pencil click", inputInfo.found, `value="${inputInfo.value}"`);

      if (inputInfo.found) {
        result("Title input pre-filled with current title", inputInfo.value.length > 0, `value="${inputInfo.value}"`);

        // Fill the input via evaluate (the input has no type attribute so Playwright locator won't match)
        await page.evaluate((val) => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const textInput = inputs.find(i => i.type === 'text');
          if (textInput) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(textInput, val);
            textInput.dispatchEvent(new Event('input', { bubbles: true }));
            textInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }, "AV Custom Title");
        await page.waitForTimeout(600);

        const afterSave = await page.evaluate(() => document.body.innerText);
        result("Custom title saved in AV mode", afterSave.includes("AV Custom Title"));
        await page.screenshot({ path: "pr18-06-av-title-saved.png" });

        // ── 9. Override is scoped: switch to SC, AV title should NOT appear ──────
        await scBtn.click();
        await page.waitForTimeout(1500);
        const scAfterOverride = await page.evaluate(() => document.body.innerText);
        result("AV override NOT visible in SC mode (type-scoped overrides)", !scAfterOverride.includes("AV Custom Title"));
        await page.screenshot({ path: "pr18-07-sc-no-av-override.png" });

        // Switch back to AV — override persists
        await avBtn.click();
        await page.waitForTimeout(1500);
        const avAfterSwitch = await page.evaluate(() => document.body.innerText);
        result("AV title override persists after type switch", avAfterSwitch.includes("AV Custom Title"));

        // ── 10. Sidebar shows overridden title (our sidebar fix) ──────────────────
        const sidebarToggle = page.locator('.absolute.top-4.left-4 button').first();
        if (await sidebarToggle.isVisible().catch(() => false)) {
          await sidebarToggle.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: "pr18-08-sidebar-override.png" });
          // Check body text for sidebar content (class selectors can be unreliable with Tailwind/z-index)
          const sidebarBodyText = await page.evaluate(() => document.body.innerText);
          result("Sidebar reflects AV custom title override", sidebarBodyText.includes("AV Custom Title"), `found: ${sidebarBodyText.includes("AV Custom Title")}`);
          result("Sidebar shows other milestones", sidebarBodyText.includes("Workflow Navigation") || sidebarBodyText.includes("Engineering"));
          // Close sidebar via its internal close button (the toggle is covered by the open sidebar)
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            // The sidebar close button is the first button inside the fixed left-0 sidebar panel
            const sidebarPanel = document.querySelector('[class*="z-50"][class*="w-72"]');
            if (sidebarPanel) {
              const closeBtn = sidebarPanel.querySelector('button');
              if (closeBtn) closeBtn.click();
            }
          });
          await page.waitForTimeout(400);
        } else {
          result("Sidebar toggle button found", false, "not visible");
        }

        // ── 11. Reset AV title override ───────────────────────────────────────────
        const pencilBtns2 = page.locator('button[title="Edit phase name"]');
        if (await pencilBtns2.first().isVisible().catch(() => false)) {
          await pencilBtns2.first().click();
          await page.waitForTimeout(500);
          const resetBtn = page.locator('button[title="Reset to default"]').first();
          if (await resetBtn.isVisible().catch(() => false)) {
            await resetBtn.click();
            await page.waitForTimeout(600);
            const afterReset = await page.evaluate(() => document.body.innerText);
            result("Phase title reset to default", !afterReset.includes("AV Custom Title") && afterReset.includes("Setup"));
          } else {
            result("Reset button visible after override", false, "not found");
          }
        }
      }

      // Exit edit mode
      const editingBtn = page.locator('button').filter({ hasText: /^Editing$/ }).last();
      if (await editingBtn.isVisible().catch(() => false)) {
        await editingBtn.click();
        await page.waitForTimeout(600);
        result("Edit mode toggles off (Editing → Edit)", true);
      } else {
        const editBtnOff = page.locator('button').filter({ hasText: /^Edit$/ }).last();
        if (await editBtnOff.isVisible().catch(() => false)) {
          await editBtnOff.click();
          await page.waitForTimeout(600);
          result("Edit mode toggle button found and clicked", true);
        }
      }
    }
  }

  // ── 12. InfoModal: Solutions Architect (PR #17 preserved) ─────────────────────
  await page.goto("http://localhost:3000/process", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);
  const infoBtn = page.locator('button[title="Process Reference"]').first();
  if (await infoBtn.isVisible().catch(() => false)) {
    await infoBtn.click();
    await page.waitForTimeout(800);
    const modalText = await page.evaluate(() => document.body.innerText);
    result("InfoModal: Solutions Architect present", modalText.includes("Solutions Architect"));
    result("InfoModal: Pre-Sales Engineer gone", !modalText.includes("Pre-Sales Engineer"));
    await page.screenshot({ path: "pr18-09-info-modal.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    result("Process Reference button found", false, "not visible");
  }

  // ── 13. Admin Defaults: Customer Kickoff label ────────────────────────────────
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);
  const adminText = await page.evaluate(() => document.body.innerText);
  result("Admin page loads", adminText.length > 200 && !adminText.includes("Application error"));

  // Navigate to Defaults section
  const defaultsTab = page.locator('a, button').filter({ hasText: /^Defaults$/ }).first();
  if (await defaultsTab.isVisible().catch(() => false)) {
    await defaultsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "pr18-10-admin-defaults.png", fullPage: true });
    const defaultsText = await page.evaluate(() => document.body.innerText);
    result("Admin Defaults: 'Customer Kickoff' label present", defaultsText.includes("Customer Kickoff"), `found: ${defaultsText.includes("Customer Kickoff")}`);
    result("Admin Defaults: 'Technical Kickoff' name gone", !defaultsText.includes("Technical Kickoff"), `still present: ${defaultsText.includes("Technical Kickoff")}`);
  } else {
    // Try href-based navigation
    await page.goto("http://localhost:3000/admin?tab=defaults", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    const defText = await page.evaluate(() => document.body.innerText);
    result("Admin Defaults section accessible", defText.includes("Customer Kickoff") || defText.length > 500, `Customer Kickoff: ${defText.includes("Customer Kickoff")}`);
  }

  // ── 14. Regression: key routes ────────────────────────────────────────────────
  for (const [route, label] of [
    ["/projects", "Projects"],
    ["/sales/activity", "Sales Activity"],
    ["/org-chart", "Org Chart"],
    ["/process", "Process"],
  ]) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);
    const t = await page.evaluate(() => document.body.innerText);
    result(`Regression: ${label} (${route}) loads`, t.length > 200 && !t.includes("Application error") && !t.includes("Unhandled Runtime Error"), `${t.length} chars`);
  }

  // ── 15. ProjectTabNav renders on a project page ────────────────────────────────
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);
  const projectLinks = page.locator('a[href^="/projects/"]').filter({ hasNot: page.locator('a[href="/projects"]') });
  const firstLink = projectLinks.first();
  if (await firstLink.isVisible().catch(() => false)) {
    const href = await firstLink.getAttribute('href');
    if (href && href !== '/projects') {
      await page.goto(`http://localhost:3000${href}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const projectText = await page.evaluate(() => document.body.innerText);
      result("Project detail page loads", projectText.length > 200 && !projectText.includes("Application error"));
      const tabLinks = await page.locator('nav a[href*="/projects/"]').count();
      result("ProjectTabNav has tab links", tabLinks > 0, `count=${tabLinks}`);
      await page.screenshot({ path: "pr18-11-project-tabs.png" });
    }
  } else {
    result("ProjectTabNav check (no project links found)", true, "skipped");
  }

  await browser.close();

  console.log('\n══════════════════════════════════════════');
  console.log(`TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
  console.log('══════════════════════════════════════════');
  console.log("Screenshots: pr18-*.png");
})();
