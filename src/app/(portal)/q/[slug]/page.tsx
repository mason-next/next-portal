"use client";

import { use, useEffect, useState } from "react";

const STYLES = `
  #portal-gate-overlay * { box-sizing: border-box; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; }
  #portal-gate-overlay .card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,168,75,0.2);
    border-radius: 16px;
    padding: 48px 40px;
    max-width: 440px;
    width: 100%;
    text-align: center;
    box-shadow: 0 24px 48px rgba(0,0,0,0.4);
  }
  #portal-gate-overlay input[type=email] {
    width: 100%;
    padding: 13px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #fff;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 12px;
  }
  #portal-gate-overlay input[type=email]:focus { border-color: #c8a84b; }
  #portal-gate-overlay input[type=email]::placeholder { color: rgba(255,255,255,0.35); }
  #portal-gate-overlay .btn {
    width: 100%;
    padding: 13px;
    background: #c8a84b;
    color: #0d1b2a;
    font-weight: 700;
    font-size: 15px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.3px;
  }
  #portal-gate-overlay .btn:hover { background: #e2c46e; }
  #portal-gate-overlay .btn:active { transform: scale(0.98); }
  #portal-gate-overlay .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
`;

export default function CustomerGatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [customer, setCustomer] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`/api/quotes/meta/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !data.isActive) setNotFound(true);
        else { setTitle(data.title); setCustomer(data.customer); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setChecking(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/quotes/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to access presentation."); return; }
      window.location.href = `/q/${slug}/view?e=${encodeURIComponent(trimmed)}`;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {/* Full-screen overlay covering root layout header */}
      <div
        id="portal-gate-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "linear-gradient(135deg, #0d1b2a 0%, #1a2d42 60%, #0a1520 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          color: "#fff",
        }}
      >
        {checking ? (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>
        ) : notFound ? (
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#c8a84b", marginBottom: 10, margin: "0 0 10px" }}>
              Not Available
            </h2>
            <p style={{ fontSize: 14, color: "#a8b8cc", lineHeight: 1.6, margin: 0 }}>
              This proposal link has expired or been deactivated.<br />
              Contact your Mason Technologies representative for assistance.
            </p>
          </div>
        ) : (
          <div className="card">
            {/* Branding */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#c8a84b", letterSpacing: 2, textTransform: "uppercase" }}>
                Mason
              </div>
              <div style={{ fontSize: 10, color: "#a8b8cc", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
                Technologies
              </div>
            </div>

            <div style={{ width: 48, height: 2, background: "rgba(200,168,75,0.3)", margin: "0 auto 20px" }} />

            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, lineHeight: 1.3, margin: "0 0 10px" }}>
              Your Proposal is Ready
            </h1>
            <p style={{ fontSize: 14, color: "#a8b8cc", lineHeight: 1.6, margin: "0 0 24px" }}>
              Enter your email address to access your personalized proposal and system design.
            </p>

            {customer && (
              <div style={{
                display: "inline-block", fontSize: 13, color: "#c8a84b", fontWeight: 600,
                background: "rgba(200,168,75,0.1)", border: "1px solid rgba(200,168,75,0.25)",
                borderRadius: 6, padding: "8px 18px", marginBottom: 28,
              }}>
                📋 {title ?? customer}
              </div>
            )}

            {error && (
              <div style={{
                color: "#e74c3c", fontSize: 13, marginBottom: 12, padding: "10px 14px",
                background: "rgba(231,76,60,0.1)", borderRadius: 6, textAlign: "left",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="your@email.com"
                required
                autoFocus
              />
              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Verifying…" : "Access My Proposal →"}
              </button>
            </form>

            {customer && (
              <p style={{ marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.5, margin: "28px 0 0" }}>
                This proposal is confidential and prepared exclusively for {customer}.<br />
                By accessing it you agree not to share or distribute its contents.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
