"use client";

import { useEffect } from "react";

/** The root layout renders lang="en"; translated pages correct it for assistive tech. */
export function DocumentLang({ lang }: { lang: string }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);
  return null;
}
