"use client";

import { usePresenceHeartbeat } from "./usePresenceHeartbeat";

// Mountable client component so the heartbeat hook runs inside the server-rendered root layout.
export function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}
