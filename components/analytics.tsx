"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect } from "react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let started = false;

function start() {
  if (started || !KEY || typeof window === "undefined") return;
  started = true;
  posthog.init(KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    autocapture: false,
  });
}

/** Records a funnel event. Does nothing when analytics is not configured. */
export function track(event: string, properties?: Record<string, unknown>) {
  if (!KEY) return;
  start();
  posthog.capture(event, properties);
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!KEY) return;
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
