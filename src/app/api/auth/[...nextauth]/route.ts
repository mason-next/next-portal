import { handlers } from "@/lib/auth/authjs";

// Auth.js mounts its OIDC endpoints here: /api/auth/signin, /api/auth/callback/*,
// /api/auth/session, /api/auth/csrf, /api/auth/providers, /api/auth/signout.
// The Portal's own /api/auth/login, /logout, /change-password, and /complete routes
// are more specific segments and take precedence over this catch-all.
export const { GET, POST } = handlers;
