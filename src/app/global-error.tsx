"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (src/app/layout.tsx).
// Must re-render the <html> and <body> tags since the layout failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error.tsx] Root layout error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#dc2626" }}>Application error</h2>
        {error.digest && (
          <pre style={{ background: "#f4f4f5", display: "inline-block", padding: "0.5rem 1rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}>
            digest: {error.digest}
          </pre>
        )}
        <p style={{ color: "#71717a", marginTop: "0.75rem", fontSize: "0.875rem" }}>
          {process.env.NODE_ENV !== "production" ? error.message : "Check server logs for the digest above."}
        </p>
        <button
          onClick={reset}
          style={{ marginTop: "1.25rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", cursor: "pointer" }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
