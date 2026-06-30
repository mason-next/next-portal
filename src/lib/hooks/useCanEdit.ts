"use client";

import { useSession } from "@/lib/auth/client";

// Returns true if the current user can edit data (Administrator or Member).
// Viewers are read-only across the entire portal.
export function useCanEdit(): boolean {
  const session = useSession();
  return session.accountType !== "Viewer";
}

// Returns true if the current user is an Administrator.
export function useIsAdmin(): boolean {
  const session = useSession();
  return session.accountType === "Administrator";
}
