import type { SessionUser } from "./types";

// Development stub — replace this function body with your auth provider when ready.
//
//   Clerk:    const { userId } = await auth();
//             const u = await clerkClient.users.getUser(userId!);
//             return { id: u.externalId ?? u.id, name: u.fullName ?? "", email: u.primaryEmailAddress!.emailAddress, role: ... };
//
//   Auth.js:  const s = await getServerSession(authOptions);
//             if (!s?.user) redirect("/login");
//             return { id: s.user.id, name: s.user.name ?? "", email: s.user.email!, role: ... };
//
//   Entra:    Validate the Authorization bearer token via MSAL and map the JWT claims.
//
// The return type (SessionUser) stays identical regardless of provider.

const DEV_STUB: SessionUser = {
  id: "user-juan-lazo",
  name: "Juan Lazo",
  email: "jlazo@mason247.com",
  role: "Administrator",
};

export async function getServerSession(): Promise<SessionUser> {
  return DEV_STUB;
}
