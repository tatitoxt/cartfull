"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ServiceWorker() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const first = firstRender.current;
    firstRender.current = false;
    if (!pathname.startsWith("/app")) return;
    // A document the worker served is already saved. Screens reached by tapping
    // around, and the very first load before the worker took over, are not.
    if (first && navigator.serviceWorker.controller) return;
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.active?.postMessage({ type: "save-page", path: `${pathname}${window.location.search}` }),
      )
      .catch(() => {});
  }, [pathname]);

  return null;
}
