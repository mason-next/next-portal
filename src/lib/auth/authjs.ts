import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// ─── Microsoft Entra ID (authentication only) ───────────────────────────────────
//
// Auth.js is used purely as the Entra OIDC client. It proves the user's Microsoft
// identity; it does NOT decide Portal access. After a successful sign-in the browser
// is sent to /api/auth/complete, which looks up the Portal user and mints the existing
// `next-portal-session` cookie. Portal authorization stays 100% on `User.roleTypes[]`.
//
// The client secret is server-side only (never NEXT_PUBLIC_). Scopes are limited to
// openid/profile/email — no Microsoft Graph permissions are requested.

const ISSUER = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";

// Derive the expected tenant GUID from the single-tenant issuer for a defense-in-depth
// tenant check. The single-tenant issuer already rejects other tenants at token
// validation; this is a belt-and-suspenders guard and a no-op for common/organizations.
const EXPECTED_TENANT =
  ISSUER.match(/login\.microsoftonline\.com\/([^/]+)\/v2\.0/i)?.[1] ?? null;

function isMultiTenantValue(v: string | null): boolean {
  return v === "common" || v === "organizations" || v === "consumers" || v === null;
}

// Single-tenant enforcement, reusable at the session-mint boundary (the bridge route).
// Returns true only when the tenant claim is acceptable: if a single tenant is
// configured, the token's tid must match it. A missing tid is left to the issuer
// validation (a single-tenant issuer already rejects other tenants at the OIDC layer).
export function isTenantAllowed(tid: string | null | undefined): boolean {
  if (isMultiTenantValue(EXPECTED_TENANT)) return true;
  if (!tid) return true;
  return tid === EXPECTED_TENANT;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: ISSUER || undefined,
      // Least privilege: basic OIDC sign-in claims only. No Graph scopes.
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  session: { strategy: "jwt" },
  // Keep users on the Portal's own pages; never show Auth.js's default provider UI.
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Tenant is authoritative — never trust an email suffix. Reject tokens from any
    // tenant other than the configured single tenant.
    signIn({ profile }) {
      const tid = (profile as { tid?: string } | undefined)?.tid;
      if (!isMultiTenantValue(EXPECTED_TENANT) && tid && tid !== EXPECTED_TENANT) {
        return false;
      }
      return true;
    },
    // Persist the immutable Entra identity on the Auth.js JWT so the bridge route can
    // bind it to the Portal user. No access/refresh tokens are stored here.
    jwt({ token, profile }) {
      if (profile) {
        const p = profile as {
          oid?: string;
          sub?: string;
          tid?: string;
          email?: string;
          preferred_username?: string;
          name?: string;
        };
        token.oid = p.oid ?? p.sub;
        token.tid = p.tid;
        token.email = (p.email ?? p.preferred_username ?? "").toLowerCase().trim();
        if (p.name) token.name = p.name;
      }
      return token;
    },
    // Expose only the minimal identity to the (server-read) Auth.js session.
    session({ session, token }) {
      // The core JWT type is an open index-signature record, so read our fields via a cast.
      const t = token as { oid?: string; tid?: string; email?: string };
      if (session.user) {
        session.user.oid = t.oid;
        session.user.tid = t.tid;
        if (t.email) session.user.email = t.email;
      }
      return session;
    },
  },
});
