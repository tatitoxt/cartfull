import "server-only";
import { cookies, headers } from "next/headers";
import { createClient } from "../supabase/server";
import type { Lang, Units } from "../catalog/localize";
import { countryByCode, guessCountry } from "./countries";
import type { Locale } from "./locale-provider";

const COOKIE_NAME = "cartfull_locale";

function parseCookie(value: string | undefined): Locale | null {
  if (!value) return null;
  try {
    let parsed: Partial<Locale>;
    try {
      parsed = JSON.parse(value) as Partial<Locale>;
    } catch {
      parsed = JSON.parse(decodeURIComponent(value)) as Partial<Locale>;
    }
    if (
      typeof parsed.country !== "string" ||
      !["en", "es"].includes(parsed.lang ?? "") ||
      !["imperial", "metric"].includes(parsed.units ?? "")
    ) return null;
    const country = countryByCode(parsed.country);
    if (country.code !== parsed.country) return null;
    return { country: country.code, lang: parsed.lang as Lang, units: parsed.units as Units };
  } catch {
    return null;
  }
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const cookieLocale = parseCookie(jar.get(COOKIE_NAME)?.value);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("country, lang, units, onboarded_at")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarded_at) {
        const country = countryByCode(data.country);
        return {
          country: country.code,
          lang: data.lang === "es" ? "es" : "en",
          units: data.units === "metric" ? "metric" : "imperial",
        };
      }
    }
  } catch {
    // Fall through to the saved locale and browser-language guess.
  }
  if (cookieLocale) return cookieLocale;
  const guessed = guessCountry((await headers()).get("accept-language"));
  return { country: guessed.code, lang: guessed.lang, units: guessed.units };
}
