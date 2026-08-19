// Emergency maintenance lockout.
//
// When MAINTENANCE_MODE is enabled, only the master account (MASTER_EMAIL, using
// MASTER_PASSWORD) can log in or hold a session. Everyone else is blocked at BOTH
// the login route and the middleware — including users who already hold a valid
// 30-day session cookie, since the middleware re-checks every request.
//
// This is fully reversible: unset MAINTENANCE_MODE (or set it to "off") to restore
// normal access. No secrets are committed to the repo — all three values are read
// from the host environment (Railway / Vercel).

/** True when the portal is locked down to the master account only. */
export function isMaintenanceMode(): boolean {
  const v = process.env.MAINTENANCE_MODE?.toLowerCase().trim();
  return v === "on" || v === "true" || v === "1";
}

/** The one email address allowed in during maintenance mode (lowercased), or null. */
export function getMasterEmail(): string | null {
  const email = process.env.MASTER_EMAIL?.toLowerCase().trim();
  return email && email.length > 0 ? email : null;
}

/** Whether the given email is the configured master account. */
export function isMasterEmail(email: string | null | undefined): boolean {
  const master = getMasterEmail();
  if (!master || !email) return false;
  return email.toLowerCase().trim() === master;
}

/** The special password the master uses during maintenance mode, or null. */
export function getMasterPassword(): string | null {
  const pw = process.env.MASTER_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}
