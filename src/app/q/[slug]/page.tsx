"use client";

import { use, useState } from "react";
import { logQuoteAccess } from "@/lib/data/quote-portal";

export default function CustomerQuotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [email, setEmail] = useState("");
  const [serveUrl, setServeUrl] = useState<string | null>(null);
  const [noFile, setNoFile] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { quoteId, htmlFile, storageKey } = await logQuoteAccess(slug, trimmed);
      if (storageKey) {
        // Build the serve URL: /api/quotes/serve/quotes/<id>/<htmlFile>
        const filePath = htmlFile.replace(/^\/+/, "");
        setServeUrl(`/api/quotes/serve/quotes/${quoteId}/${filePath}`);
      } else {
        setNoFile(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Presentation not found or no longer available.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Presentation loaded — show it fullscreen in an iframe
  if (serveUrl) {
    return (
      <iframe
        src={serveUrl}
        className="fixed inset-0 w-full h-full border-0"
        title="Presentation"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    );
  }

  // Access logged but no file uploaded yet
  if (noFile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-card shadow-lg p-8 text-center space-y-4">
          <div className="text-3xl">✓</div>
          <h1 className="text-lg font-semibold">Access confirmed</h1>
          <p className="text-sm text-muted-foreground">
            Your access has been logged. The team will send the presentation to{" "}
            <strong>{email}</strong> shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-lg p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">View Presentation</h1>
          <p className="text-sm text-muted-foreground">Enter your email to access this proposal.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
              placeholder="you@company.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Access Presentation"}
          </button>
        </form>
      </div>
    </div>
  );
}
