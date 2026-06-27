"use client";

import { use, useState } from "react";
import { logQuoteAccess } from "@/lib/data/quote-portal";

export default function CustomerQuotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
      await logQuoteAccess(slug, trimmed);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Presentation not found or no longer available.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-card shadow-lg p-8 text-center space-y-4">
          <div className="text-3xl">✓</div>
          <h1 className="text-lg font-semibold">You&apos;re in</h1>
          <p className="text-sm text-muted-foreground">
            Your presentation is ready. The team will follow up at <strong>{email}</strong>.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            (Presentation file delivery is coming soon — this confirms your access has been logged.)
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
