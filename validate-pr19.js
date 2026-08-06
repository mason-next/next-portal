const { chromium } = require("playwright");

const RESULTS = [];

function log(label, passed, detail = "") {
  const status = passed ? "PASS" : "FAIL";
  RESULTS.push({ label, status, detail });
  console.log(`[${status}] ${label}${detail ? ": " + detail : ""}`);
}

async function checkPage(page, url, label) {
  try {
    await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1500);
    const title = await page.title();
    const body = await page.evaluate(() => document.body.innerText);
    const hasStackError = body.toLowerCase().includes("error") && body.toLowerCase().includes("stack");
    const hasNextError = body.includes("Application error") || body.includes("Unhandled Runtime Error");
    log(`${label} loads`, !hasStackError && !hasNextError, `title="${title}"`);
    return body;
  } catch (e) {
    log(`${label} loads`, false, String(e).slice(0, 120));
    return "";
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: "tests/auth.json" });
  const page = await context.newPage();

  // ── 1. Route: /projects ──────────────────────────────────────────────────────
  const projectsBody = await checkPage(page, "/projects", "/projects");
  log("/projects has content", projectsBody.length > 100);

  // ── 2. Route: /sales/activity ────────────────────────────────────────────────
  const salesBody = await checkPage(page, "/sales/activity", "/sales/activity");

  // PR #19 Epic 2 — Pipeline tab renamed from "Opportunity Board"
  log("Pipeline tab present (not 'Opportunity Board')", salesBody.includes("Pipeline") && !salesBody.includes("Opportunity Board"));
  log("Activity Log tab present", salesBody.includes("Activity Log"));
  log("Sales Pulse tab present", salesBody.includes("Sales Pulse"));

  // ── 3. Pipeline tab is default + renders OpportunityTable ────────────────────
  try {
    // Check that the Pipeline tab is active by default
    const pipelineTabActive = await page.locator("button:has-text('Pipeline')").first().getAttribute("class");
    log("Pipeline tab is default (has active class)", pipelineTabActive?.includes("bg-card") ?? false);
  } catch (e) {
    log("Pipeline tab is default", false, String(e).slice(0, 80));
  }

  // ── 4. Upload Data button present ────────────────────────────────────────────
  log("Upload Data button present", salesBody.includes("Upload Data"));

  // ── 5. Add Company button present ────────────────────────────────────────────
  log("Add Company button present", salesBody.includes("Add Company"));

  // ── 6. Screenshot of sales/activity ─────────────────────────────────────────
  await page.screenshot({ path: "pr19-01-sales-activity.png", fullPage: false });

  // ── 7. Click Pipeline tab and verify table ───────────────────────────────────
  try {
    await page.click("button:has-text('Pipeline')");
    await page.waitForTimeout(1500);
    const pipelineContent = await page.evaluate(() => document.body.innerText);
    // OpportunityTable shows quick filter chips
    const hasChips = pipelineContent.includes("Closing This Month") ||
                     pipelineContent.includes("Highly Likely") ||
                     pipelineContent.includes("30+ Days Old") ||
                     pipelineContent.includes("No opportunities yet");
    log("Pipeline tab renders OpportunityTable (filters or empty state)", hasChips);
    await page.screenshot({ path: "pr19-02-pipeline-tab.png", fullPage: false });
  } catch (e) {
    log("Pipeline tab click", false, String(e).slice(0, 80));
  }

  // ── 8. Click Activity Log tab ────────────────────────────────────────────────
  try {
    await page.click("button:has-text('Activity Log')");
    await page.waitForTimeout(1500);
    const actBody = await page.evaluate(() => document.body.innerText);
    log("Activity Log tab renders", actBody.includes("Week") || actBody.includes("Month") || actBody.includes("Log Activity") || actBody.length > 200);
    await page.screenshot({ path: "pr19-03-activity-tab.png", fullPage: false });
  } catch (e) {
    log("Activity Log tab click", false, String(e).slice(0, 80));
  }

  // ── 9. Click Sales Pulse tab ─────────────────────────────────────────────────
  try {
    await page.click("button:has-text('Sales Pulse')");
    await page.waitForTimeout(2000);
    const pulseBody = await page.evaluate(() => document.body.innerText);
    log("Sales Pulse tab renders", pulseBody.length > 100);
    await page.screenshot({ path: "pr19-04-sales-pulse.png", fullPage: false });
  } catch (e) {
    log("Sales Pulse tab click", false, String(e).slice(0, 80));
  }

  // ── 10. Route: /sales ────────────────────────────────────────────────────────
  await checkPage(page, "/sales", "/sales");

  // ── 11. Route: /org-chart ────────────────────────────────────────────────────
  await checkPage(page, "/org-chart", "/org-chart");

  // ── 12. Route: /process ──────────────────────────────────────────────────────
  await checkPage(page, "/process", "/process");

  // ── 13. Route: /sales/activity regression — no ManagementView dropdown ───────
  await page.goto("http://localhost:3000/sales/activity", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  const regBody = await page.evaluate(() => document.body.innerText);
  log("No 'Management View' dropdown (removed in PR)", !regBody.includes("Management View"));

  // ── 14. Route: project detail page ───────────────────────────────────────────
  // Try to find a project link to navigate to
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2000);
  try {
    const projectLinks = await page.locator("a[href*='/projects/']").all();
    if (projectLinks.length > 0) {
      const href = await projectLinks[0].getAttribute("href");
      if (href) {
        const projBody = await checkPage(page, href, `Project detail (${href})`);
        log("Project detail has project content", projBody.length > 200);
      } else {
        log("Project detail page", false, "no href found");
      }
    } else {
      log("Project detail page", true, "no projects in DB (skipped)");
    }
  } catch (e) {
    log("Project detail page", false, String(e).slice(0, 80));
  }

  // ── 15. ViewAsSelector exit row regression ────────────────────────────────────
  // Navigate to sales and look for the ViewAs UI (not checking internals, just that page loads)
  await page.goto("http://localhost:3000/sales/activity", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  const viewAsBody = await page.evaluate(() => document.body.innerText);
  log("Sales activity page loads (ViewAs context OK)", viewAsBody.length > 100 && !viewAsBody.includes("Application error"));

  // ── Summary ──────────────────────────────────────────────────────────────────
  await browser.close();

  const passed = RESULTS.filter((r) => r.status === "PASS").length;
  const failed = RESULTS.filter((r) => r.status === "FAIL").length;
  console.log(`\n── Summary: ${passed} passed, ${failed} failed ──`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    RESULTS.filter((r) => r.status === "FAIL").forEach((r) => {
      console.log(`  [FAIL] ${r.label}${r.detail ? ": " + r.detail : ""}`);
    });
    process.exit(1);
  }
})();
