"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";

const KEY = "cartfull:consent";

/** One-tap cookie notice; only essential cookies are set either way, so both buttons just record the choice. */
export function ConsentBanner() {
  const m = useMessages();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable: don't nag */
    }
  }, []);

  if (!show) return null;
  const choose = (value: string) => () => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label={m.consent.title}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-card bg-surface p-4 shadow-[0_0_0_1.5px_var(--color-line),0_12px_40px_rgba(0,0,0,0.5)]"
      data-testid="consent-banner"
    >
      <p className="text-sm font-semibold">{m.consent.title}</p>
      <p className="mt-1 text-sm text-fg-soft">
        {m.consent.body}{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          {m.consent.learnMore}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary px-4 py-2 text-sm" onClick={choose("all")} data-testid="consent-accept">
          {m.consent.accept}
        </button>
        <button type="button" className="btn btn-quiet px-4 py-2 text-sm" onClick={choose("essential")} data-testid="consent-essential">
          {m.consent.essential}
        </button>
      </div>
    </div>
  );
}
