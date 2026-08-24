import Image from "next/image";
import { auth } from "@/lib/auth/authjs";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

// Shown when a Microsoft sign-in succeeds but the person has no active Portal account.
// They hold an Auth.js (identity) session but no `next-portal-session`, so they cannot
// reach any protected route. This page is public (see middleware PUBLIC_PATHS) to avoid
// a redirect loop.
export default async function AccessDeniedPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/mason-logo.png" alt="NEXT Portal" width={4698} height={1615} className="h-4 w-auto" priority />
        </div>

        <div className="rounded-xl border bg-background p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Access not available</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Your Microsoft account was authenticated successfully, but you do not currently have access to
            NEXT Portal. Please contact a NEXT Portal administrator.
          </p>

          {email && (
            <p className="mb-6 text-sm">
              Signed in as <span className="font-medium">{email}</span>
            </p>
          )}

          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
