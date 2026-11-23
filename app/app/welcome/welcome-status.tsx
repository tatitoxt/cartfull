"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/components/analytics";

export function WelcomeStatus({ active, status, interval }: { active: boolean; status: string; interval: string | null }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const tracked = useRef(false);

  useEffect(() => {
    if (active) {
      if (!tracked.current) {
        tracked.current = true;
        track(status === "trialing" ? "trial_started" : "subscription_started", { interval });
      }
      return;
    }
    if (tries >= 15) return;
    // The webhook usually lands within a second or two of the redirect.
    const timer = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(timer);
  }, [active, interval, router, status, tries]);

  if (active) {
    return (
      <section className="py-10" data-testid="welcome-active">
        <h1 className="text-4xl sm:text-5xl">You&apos;re in</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          {status === "trialing"
            ? "Your 7-day free trial has started. Plan as many weeks as you like."
            : "Your subscription is active. Plan as many weeks as you like."}
        </p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          Go to my plan
        </Link>
      </section>
    );
  }

  return (
    <section className="py-10" role="status">
      <h1 className="text-4xl">{tries >= 15 ? "Still confirming your payment" : "Confirming with Stripe…"}</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        {tries >= 15
          ? "This is taking longer than usual. Your card is safe. Refresh in a minute, or check Account."
          : "This takes a few seconds. Keep this page open."}
      </p>
      {tries >= 15 && (
        <Link href="/app/account" className="btn btn-quiet mt-6">
          Go to Account
        </Link>
      )}
    </section>
  );
}
