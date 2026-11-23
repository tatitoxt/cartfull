"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect } from "react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const CONSENT = "cartfull:consent";
let started = false;

/** Analytics is opt-in: only an explicit "all" choice turns it on. */
function consented(): boolean {
  try {
    return localStorage.getItem(CONSENT) === "all";
  } catch {
    return false;
  }
}

/** /share/<token> links grant list access; never let the token reach analytics. */
function scrubTokens(value: unknown): unknown {
  return typeof value === "string" ? value.replace(/\/share\/[0-9a-fA-F-]{8,}/g, "/share/…") : value;
}

function start() {
  if (started || !KEY || typeof window === "undefined" || !consented()) return;
  started = true;
  posthog.init(KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    autocapture: false,
    sanitize_properties: (props) => {
      for (const k of ["$current_url", "$referrer", "$initial_referrer", "$referring_domain"]) {
        if (k in props) props[k] = scrubTokens(props[k]);
      }
      return props;
    },
  });
}

/** Records a funnel event. Does nothing when analytics is not configured. */
export function track(event: string, properties?: Record<string, unknown>) {
  if (!KEY || !consented()) return;
  start();
  posthog.capture(event, properties);
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!KEY || !consented()) return;
  start();
  posthog.identify(userId, properties);
}

export function resetAnalytics() {
  if (!KEY || !started) return;
  posthog.reset();
}

function Pageviews() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!KEY) return;
    // /share/<token> URLs grant list access: never send the token to analytics.
    if (pathname.startsWith("/share/")) return;
    if (!consented()) return;
    start();
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, search]);
  return null;
}

export function Analytics() {
  if (!KEY) return null;
  return (
    <Suspense fallback={null}>
      <Pageviews />
    </Suspense>
  );
}
