"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/components/analytics";
import { createClient } from "@/lib/supabase/client";

type Stage = "email" | "sent";

export function LoginForm({
  next,
  googleEnabled,
  linkError,
}: {
  next: string;
  googleEnabled: boolean;
  linkError: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? "That link has expired or was already used. Enter your email for a new one." : null,
  );

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many tries. Wait a minute and ask for a new link."
          : "We couldn't send the email. Check the address and try again.",
      );
      return;
    }
    track("signin_link_requested");
    setStage("sent");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("That code didn't match. Check the email and try again.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setBusy(false);
      setError("Google sign-in isn't available right now. Use your email instead.");
    }
  }

  if (stage === "sent") {
    return (
      <div className="mt-8">
        <div className="rounded-card bg-mint-soft p-5" role="status">
          <p className="font-semibold text-green-deep">Check your inbox</p>
          <p className="mt-1 text-ink-soft">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Tap it on this device, or
            type the 6-digit code from the email below.
          </p>
        </div>
        <form onSubmit={verifyCode} className="mt-6 space-y-3">
          <label htmlFor="code" className="block text-sm font-medium">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="field tnum tracking-[0.3em]"
            aria-describedby={error ? "login-error" : undefined}
          />
          {error && (
            <p id="login-error" role="alert" className="text-sm text-tomato-deep">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-green underline underline-offset-4"
          onClick={() => {
            setStage("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <form onSubmit={sendLink} className="space-y-3">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          aria-describedby={error ? "login-error" : undefined}
        />
        {error && (
          <p id="login-error" role="alert" className="text-sm text-tomato-deep">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-sm text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" onClick={google} className="btn btn-quiet w-full" disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}
