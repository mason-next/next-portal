/**
 * Playwright global setup — runs once before the test suite.
 *
 * Uses raw fetch (no browser) to:
 *  1. Log in via the API and extract the session cookie.
 *  2. Hit each page the tests use with that cookie, triggering Turbopack SSR
 *     compilation before any test starts (avoids cold-start timeouts in beforeEach).
 *  3. Write tests/auth.json so Playwright's storageState gives each test a
 *     pre-authenticated browser context — no per-test login roundtrip.
 *
 * Each page GET is allowed up to 3 minutes; Turbopack's first compile for a
 * complex route can take 60-90 s on a cold server.
 */

import * as fs from "fs/promises";
import * as path from "path";

const BASE = "http://localhost:3000";
const LOGIN_EMAIL = "jlazo@mason247.com";
const LOGIN_PASSWORD = "password";
const PROJECT_ID = "c5a12d8a-552d-48b2-b5c4-5db037d6dad8";

const WARM_PATHS = [
  "/projects",
  `/projects/${PROJECT_ID}`,
  `/projects/${PROJECT_ID}/implementation`,
];

/** Fetch with a configurable timeout (ms). */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function globalSetup() {
  console.log("[global-setup] Logging in via API…");

  const loginRes = await fetchWithTimeout(
    `${BASE}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    },
    30000
  );

  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`[global-setup] Login failed (${loginRes.status}): ${body}`);
  }

  // Extract the raw Set-Cookie string; may contain multiple values joined by ", ".
  const rawCookies = loginRes.headers.get("set-cookie") ?? "";
  if (!rawCookies) {
    throw new Error("[global-setup] No Set-Cookie header in login response.");
  }

  // Build a Cookie header for subsequent requests.
  // Format: name=value pairs only (strip attributes like HttpOnly, SameSite, …).
  const cookieHeader = rawCookies
    .split(/,(?=\s*\w+=)/)       // split on ", name=" boundaries
    .map((part) => part.split(";")[0].trim())
    .join("; ");

  console.log("[global-setup] Login successful. Warming up routes…");

  for (const urlPath of WARM_PATHS) {
    const url = `${BASE}${urlPath}`;
    console.log(`[global-setup]   GET ${url}`);
    const res = await fetchWithTimeout(
      url,
      { headers: { Cookie: cookieHeader } },
      180000  // 3 minutes per route
    );
    console.log(`[global-setup]   → ${res.status}`);
  }

  // Write auth.json in Playwright storageState format so each test context
  // starts with the session cookie already set.
  const cookieParts = rawCookies.split(/,(?=\s*\w+=)/);
  const cookies = cookieParts.map((part) => {
    const segments = part.split(";").map((s) => s.trim());
    // Use indexOf to split only on the FIRST "=" — cookie values (JWTs) may contain "=".
    const firstEq = segments[0].indexOf("=");
    const name = segments[0].slice(0, firstEq).trim();
    const value = segments[0].slice(firstEq + 1).trim();
    const attrs: Record<string, string> = {};
    for (const seg of segments.slice(1)) {
      const eqIdx = seg.indexOf("=");
      if (eqIdx === -1) {
        attrs[seg.toLowerCase()] = "true";
      } else {
        attrs[seg.slice(0, eqIdx).trim().toLowerCase()] = seg.slice(eqIdx + 1).trim();
      }
    }
    // Playwright requires sameSite to be exactly "Strict", "Lax", or "None" (title-cased).
    const rawSameSite = attrs["samesite"] ?? "Lax";
    const sameSite = (rawSameSite.charAt(0).toUpperCase() + rawSameSite.slice(1).toLowerCase()) as
      | "Strict"
      | "Lax"
      | "None";
    return {
      name,
      value,
      domain: "localhost",
      path: attrs["path"] ?? "/",
      expires: attrs["max-age"] ? Date.now() / 1000 + parseInt(attrs["max-age"], 10) : -1,
      httpOnly: "httponly" in attrs,
      secure: "secure" in attrs,
      sameSite,
    };
  });

  const authState = { cookies, origins: [] };
  const authPath = path.resolve(__dirname, "auth.json");
  await fs.writeFile(authPath, JSON.stringify(authState, null, 2));
  console.log(`[global-setup] Auth state saved to ${authPath}`);
}
