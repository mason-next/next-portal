"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";

function MicrosoftIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Messages passed as query flags by the middleware / auth bridge.
  const notice = params.get("locked")
    ? "The portal is in maintenance mode. Access is temporarily restricted."
    : "";
  const queryError = params.get("error") ? "Sign-in could not be completed. Please try again." : "";
  const shownError = error || queryError;

  function handleMicrosoft() {
    setError("");
    setMsLoading(true);
    void signIn("microsoft-entra-id", { redirectTo: "/api/auth/complete" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/mason-logo.png" alt="NEXT Portal" width={4698} height={1615} className="h-4 w-auto" priority />
        </div>

        <div className="rounded-xl border bg-background p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold">Welcome to NEXT Portal</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in with your Mason Technologies account to continue.
          </p>

          {notice && (
            <div className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-foreground">{notice}</div>
          )}
          {shownError && (
            <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{shownError}</div>
          )}

          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={msLoading}
            className="flex w-full items-center justify-center gap-2.5 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MicrosoftIcon />
            {msLoading ? "Redirecting…" : "Sign in with Microsoft"}
          </button>

          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="mt-6 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Administrator sign-in
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t pt-6">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
