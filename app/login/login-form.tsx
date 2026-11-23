"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/components/analytics";
import { normalizeEmail, REQUESTED_COOKIE } from "@/lib/auth/requested";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

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
  const m = useMessages();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? m.login.expired : null,
  );

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  // The emailed link names the address it signs in, so the person opening it can be told.
  const linkTarget = () => `${redirectTo()}&email=${encodeURIComponent(normalizeEmail(email))}`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // The emailed link signs in without a question only in the browser that asked for it.
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${REQUESTED_COOKIE}=${encodeURIComponent(normalizeEmail(email))}; path=/auth; max-age=3600; samesite=lax${secure}`;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: linkTarget(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? m.login.tooMany
          : m.login.sendError,
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
      setError(m.login.codeError);
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
      setError(m.login.googleError);
    }
  }

  if (stage === "sent") {
    return (
      <div className="mt-8">
        <div className="rounded-card bg-accent-soft p-5" role="status">
          <p className="font-semibold text-accent-deep">{m.login.inbox}</p>
          <p className="mt-1 text-fg-soft">
            {fill(m.login.sent, { email })}
          </p>
        </div>
        <form onSubmit={verifyCode} className="mt-6 space-y-3">
          <label htmlFor="code" className="block text-sm font-medium">
            {m.login.codeLabel}
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
            <p id="login-error" role="alert" className="text-sm text-over-deep">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || code.length !== 6}>
            {busy ? m.login.checking : m.login.signIn}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-accent underline underline-offset-4"
          onClick={() => {
            setStage("email");
            setCode("");
            setError(null);
          }}
        >
          {m.login.differentEmail}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <form onSubmit={sendLink} className="space-y-3">
        <label htmlFor="email" className="block text-sm font-medium">
          {m.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={m.login.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          aria-describedby={error ? "login-error" : undefined}
        />
        {error && (
          <p id="login-error" role="alert" className="text-sm text-over-deep">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? m.login.sending : m.login.send}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-sm text-fg-faint">
            <span className="h-px flex-1 bg-line" />
            {m.login.or}
            <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" onClick={google} className="btn btn-quiet w-full" disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            {m.login.google}
          </button>
        </>
      )}
    </div>
  );
}
