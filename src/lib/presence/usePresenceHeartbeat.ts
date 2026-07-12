"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 s

// Sends an authenticated heartbeat to /api/users/heartbeat while the tab is visible.
// Multiple open tabs are harmless — each writes the same user's lastActiveAt; the last
// write wins and the DB stays at a single accurate timestamp.
export function usePresenceHeartbeat() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function beat() {
      if (document.visibilityState !== "visible") return;
      fetch("/api/users/heartbeat", { method: "POST" }).catch(() => {});
    }

    function startTimer() {
      if (timer !== null) return;
      beat(); // immediate on mount / tab-focus
      timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    }

    function stopTimer() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        startTimer();
      } else {
        stopTimer();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    startTimer();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTimer();
    };
  }, []);
}
