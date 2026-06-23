"use client";

import { useEffect, useState } from "react";
import { readGlobal } from "@/lib/storage/local-store";

export const CURRENT_USER_AVATAR_KEY = "current-user-avatar";

// The logged-in user's avatar (set via the upload control in the header) — read here so
// any UI showing "you" (header avatar, your own comments, etc.) stays in sync with it
// instead of each spot keeping its own copy.
export function useCurrentUserAvatar(): string | null {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setAvatar(readGlobal<string>(CURRENT_USER_AVATAR_KEY)));
  }, []);

  return avatar;
}
