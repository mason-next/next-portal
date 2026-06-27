"use client";

import { useEffect, useState } from "react";
import { readGlobal } from "@/lib/storage/local-store";

export const CURRENT_USER_AVATAR_KEY = "current-user-avatar";

// The logged-in user's avatar — prefers a file the user just uploaded (stored in localStorage),
// falls back to the DB avatarUrl from the user record. Pass the DB avatar as dbFallback so the
// header and comments show the right photo without requiring an upload.
export function useCurrentUserAvatar(dbFallback?: string | null): string | null {
  const [uploaded, setUploaded] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setUploaded(readGlobal<string>(CURRENT_USER_AVATAR_KEY)));
  }, []);

  return uploaded ?? dbFallback ?? null;
}
