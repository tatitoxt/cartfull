"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Lang, Units } from "../catalog/localize";
import { MESSAGES } from "./messages";

export interface Locale {
  country: string;
  lang: Lang;
  units: Units;
}

interface LocaleContextValue extends Locale {
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, updateLocale] = useState(initial);
  const setLocale = (next: Locale) => {
    updateLocale(next);
    document.documentElement.lang = next.lang;
  };
  const value = useMemo(() => ({ ...locale, setLocale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing");
  return value;
}

export function useMessages() {
  return MESSAGES[useLocale().lang];
}
