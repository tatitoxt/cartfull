"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let timer: ReturnType<typeof setTimeout> | undefined;
const waiting = new Set<string>();

/**
 * Asks the service worker to keep a fresh copy of the screen being shown. Call
 * it after a change that redraws the screen in place (a swap, a check-off), so
 * the copy opened later without a connection is not the one from before.
 */
export function keepForOffline() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  // Remembered now: by the time the save runs, the person may be on another screen.
  waiting.add(`${window.location.pathname}${window.location.search}`);
  clearTimeout(timer);
  // A run of taps saves once, after the last one.
  timer = setTimeout(() => {
    const paths = [...waiting];
    waiting.clear();
    navigator.serviceWorker.ready
      .then((registration) => paths.forEach((path) => registration.active?.postMessage({ type: "save-page", path })))
      .catch(() => {});
  }, 600);
}

export function ServiceWorker() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Leaving the app is the last chance before the connection may be gone.
    const onHide = () => document.visibilityState === "hidden" && keepForOffline();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    const first = firstRender.current;
    firstRender.current = false;
    if (!pathname.startsWith("/app")) return;
    // A document the worker served is already saved. Screens reached by tapping
    // around, and the very first load before the worker took over, are not.
    if (first && navigator.serviceWorker?.controller) return;
    keepForOffline();
  }, [pathname]);

  return null;
}
