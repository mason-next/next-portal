import type { DefaultSession } from "next-auth";

// Augment Auth.js types with the minimal Entra identity we carry through the
// authentication step (used only to bind the Portal user in /api/auth/complete).
declare module "next-auth" {
  interface Session {
    user: {
      /** Entra Object ID (immutable identity link). */
      oid?: string;
      /** Entra Tenant ID. */
      tid?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oid?: string;
    tid?: string;
    email?: string;
  }
}
