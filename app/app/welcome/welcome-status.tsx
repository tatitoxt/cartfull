"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/components/analytics";
import type { Lang } from "@/lib/catalog/localize";
import { MESSAGES } from "@/lib/i18n/messages";

export function WelcomeStatus({ active, status, interval, lang }: { active: boolean; status: string; interval: string | null; lang: Lang }) {
  const m = MESSAGES[lang];
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
        <h1 className="text-4xl sm:text-5xl">{m.welcome.title}</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          {status === "trialing"
            ? m.welcome.trial
            : m.welcome.active}
        </p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          {m.common.goPlan}
        </Link>
      </section>
    );
  }

  return (
    <section className="py-10" role="status">
      <h1 className="text-4xl">{tries >= 15 ? m.welcome.confirmingLong : m.welcome.confirming}</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        {tries >= 15
          ? m.welcome.waitLong
          : m.welcome.wait}
      </p>
      {tries >= 15 && (
        <Link href="/app/account" className="btn btn-quiet mt-6">
          {m.welcome.goAccount}
        </Link>
      )}
    </section>
  );
}
