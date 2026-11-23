"use client";

import { useState } from "react";
import { COUNTRIES, countryByCode } from "@/lib/i18n/countries";
import type { Answers } from "@/lib/app/profile";
import type { Lang, Units } from "@/lib/catalog/localize";
import { useMessages } from "@/lib/i18n/locale-provider";

export function CountryPreferences({ answers, set }: { answers: Answers; set: (patch: Partial<Answers>) => void }) {
  const m = useMessages();
  const [query, setQuery] = useState("");
  const changeCountry = (code: string) => {
    const next = countryByCode(code);
    set({ country: next.code, lang: next.lang, units: next.units });
  };
  const needle = query.trim().toLowerCase();
  const countries = needle
    ? COUNTRIES.filter((c) => c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(needle) || c.name.toLowerCase().includes(needle))
    : COUNTRIES;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="font-medium">{m.onboarding.countryTitle}</legend>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.onboarding.countrySearch}
          className="mt-3 w-full rounded-full bg-surface px-4 py-2.5 text-sm shadow-[inset_0_0_0_1.5px_var(--color-line)] outline-none placeholder:text-fg-faint focus-visible:shadow-[inset_0_0_0_2px_var(--color-accent)]"
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {countries.map((option) => {
            const selected = option.code === answers.country;
            return (
              <label
                key={option.code}
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  selected
                    ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]"
                    : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                }`}
              >
                <input
                  type="radio"
                  name="country"
                  value={option.code}
                  checked={selected}
                  onChange={() => changeCountry(option.code)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded-full ${selected ? "bg-accent" : "shadow-[inset_0_0_0_1.5px_var(--color-fg-faint)]"}`}
                >
                  {selected && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span className="font-semibold leading-tight">{option.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium">{m.onboarding.language}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["en", "es"] as Lang[]).map((lang) => (
              <label
                key={lang}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium ${
                  answers.lang === lang ? "bg-accent-soft text-accent-deep shadow-[inset_0_0_0_2px_var(--color-accent)]" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang}
                  checked={answers.lang === lang}
                  onChange={() => set({ lang })}
                  className="sr-only"
                />
                {lang === "en" ? m.onboarding.english : m.onboarding.spanish}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">{m.onboarding.units}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["metric", "imperial"] as Units[]).map((units) => (
              <label
                key={units}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium ${
                  answers.units === units ? "bg-accent-soft text-accent-deep shadow-[inset_0_0_0_2px_var(--color-accent)]" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                }`}
              >
                <input
                  type="radio"
                  name="units"
                  value={units}
                  checked={answers.units === units}
                  onChange={() => set({ units })}
                  className="sr-only"
                />
                {units === "metric" ? m.onboarding.metric : m.onboarding.imperial}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
