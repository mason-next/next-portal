"use client";

import { useEffect } from "react";

// Global error boundary for the App Router tree.
// In production Next.js replaces the error message with a generic string; the
// `digest` is the key that links it to the real stack trace in server logs.
// Showing the digest here lets the user give us the exact log entry to look up.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to browser console with all available detail.
    console.error("[app/error.tsx] Unhandled render error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight text-destructive">Something went wrong</h2>
      {error.digest && (
        <p className="mt-2 rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
          digest: {error.digest}
        </p>
      )}
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        {process.env.NODE_ENV !== "production" ? error.message : "An unexpected error occurred. Check server logs for the digest above."}
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
