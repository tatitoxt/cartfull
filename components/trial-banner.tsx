"use client";

import Link from "next/link";
import { useState } from "react";

const KEY = "cartfull:trial-banner-dismissed";

/**
 * Violet pill shown while the free trial is running out. Closing it stores the
 * trial's end date, so it only comes back if a later trial starts instead.
 */
export function TrialBanner({
  trialEnd,
  endsLabel,
  ctaLabel,
  closeLabel,
}: {
  trialEnd: string;
  endsLabel: string;
  ctaLabel: string;
  closeLabel: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === trialEnd;
    } catch {
      return false;
    }
  });
  if (dismissed) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, trialEnd);
    } catch {
      /* private mode */
    }
    setDismissed(true);
  };

  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-full border border-violet-400/40 bg-violet-400/10 px-4 py-2.5 text-sm">
      <Link href="/app/upgrade" className="flex min-w-0 items-center justify-between gap-3 flex-1">
        <span className="truncate text-foreground">{endsLabel}</span>
        <span className="shrink-0 font-semibold text-violet-300">{ctaLabel} →</span>
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label={closeLabel}
        className="shrink-0 rounded-full p-1 text-fg-faint transition-colors hover:bg-violet-400/20 hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}
