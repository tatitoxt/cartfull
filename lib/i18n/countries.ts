import type { Lang, Units } from "../catalog/localize";

export interface Country {
  code: string;
  /** The country's own name, shown in the picker. */
  name: string;
  lang: Lang;
  units: Units;
}

/** Where Cartfull asks people where they cook. The first answer sets language and units. */
export const COUNTRIES: readonly Country[] = [
  { code: "US", name: "United States", lang: "en", units: "imperial" },
  { code: "MX", name: "México", lang: "es", units: "metric" },
  { code: "AR", name: "Argentina", lang: "es", units: "metric" },
  { code: "CO", name: "Colombia", lang: "es", units: "metric" },
  { code: "CL", name: "Chile", lang: "es", units: "metric" },
  { code: "PE", name: "Perú", lang: "es", units: "metric" },
  { code: "ES", name: "España", lang: "es", units: "metric" },
  { code: "UY", name: "Uruguay", lang: "es", units: "metric" },
  { code: "CA", name: "Canada", lang: "en", units: "metric" },
  { code: "GB", name: "United Kingdom", lang: "en", units: "metric" },
  { code: "AU", name: "Australia", lang: "en", units: "metric" },
  { code: "OTHER_ES", name: "Otro país (español)", lang: "es", units: "metric" },
  { code: "OTHER_EN", name: "Another country (English)", lang: "en", units: "metric" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];
export const DEFAULT_COUNTRY = COUNTRIES[0];

export function countryByCode(code: string | null | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

/** Best first guess from the browser's Accept-Language header, e.g. "es-AR,es;q=0.9". */
export function guessCountry(acceptLanguage: string | null | undefined): Country {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const [lang, region] = part.split(";")[0].trim().split("-");
    const match = region && COUNTRIES.find((c) => c.code === region.toUpperCase());
    if (match) return match;
    if (lang?.toLowerCase() === "es") return countryByCode("OTHER_ES");
    if (lang?.toLowerCase() === "en") return DEFAULT_COUNTRY;
  }
  return DEFAULT_COUNTRY;
}
