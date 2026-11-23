"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/components/analytics";
import { fill, type LandingCopy } from "@/lib/i18n/landing";

const MIN = 60;
const MAX = 450;

export function Calculator({ planned, copy, cta }: { planned: number[]; copy: LandingCopy["calc"]; cta: string }) {
  const [people, setPeople] = useState(4);
  const [spend, setSpend] = useState(240);

  const plannedDollars = Math.min(spend, planned[people - 1] / 100);
  const weekly = Math.max(0, spend - plannedDollars);
  const monthly = Math.round((weekly * 52) / 12);
  const yearly = Math.round(weekly * 52);
  const sliderFill = ((spend - MIN) / (MAX - MIN)) * 100;
  const href = `/start?people=${people}&spend=${spend}&budget=${Math.round(plannedDollars)}`;

  return (
    <section aria-labelledby="calc-title" className="rounded-card bg-surface p-5 shadow-[0_1px_0_var(--color-line),0_24px_48px_-28px_rgb(28_27_26/0.35)] sm:p-7">
      <h2 id="calc-title" className="text-2xl">
        {copy.title}
      </h2>

      <div className="mt-6 flex items-center justify-between gap-4" role="group" aria-label={copy.people}>
        <span className="font-medium">{copy.people}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-2xl leading-none shadow-[inset_0_0_0_1.5px_var(--color-line)] disabled:opacity-40"
            onClick={() => setPeople((n) => Math.max(1, n - 1))}
            disabled={people <= 1}
            aria-label={copy.fewer}
          >
            −
          </button>
          <output className="tnum w-8 text-center text-xl font-semibold" aria-live="polite" data-testid="calc-people">
            {people}
          </output>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-2xl leading-none shadow-[inset_0_0_0_1.5px_var(--color-line)] disabled:opacity-40"
            onClick={() => setPeople((n) => Math.min(8, n + 1))}
            disabled={people >= 8}
            aria-label={copy.more}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="calc-spend" className="font-medium">
            {copy.spend}
          </label>
          <output htmlFor="calc-spend" className="tnum font-display text-3xl font-semibold" data-testid="calc-spend">
            ${spend}
          </output>
        </div>
        <input
          id="calc-spend"
          type="range"
          className="slider mt-2"
          min={MIN}
          max={MAX}
          step={5}
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          style={{ "--fill": `${sliderFill}%` } as React.CSSProperties}
          aria-valuetext={`$${spend}`}
        />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5" aria-live="polite">
        <div>
          <dt className="text-sm text-fg-soft">{copy.planned}</dt>
          <dd className="tnum mt-1 font-display text-4xl font-semibold text-accent-deep" data-testid="calc-planned">
            ${Math.round(plannedDollars)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-soft">{copy.monthly}</dt>
          <dd className="tnum mt-1 font-display text-4xl font-semibold text-accent-deep" data-testid="calc-monthly">
            ${monthly.toLocaleString("en-US")}
          </dd>
        </div>
      </dl>
      <p className="tnum mt-3 min-h-6 text-fg-soft">{weekly > 0 ? fill(copy.yearly, { amount: `$${yearly.toLocaleString("en-US")}` }) : copy.lean}</p>

      <Link href={href} className="btn btn-cta mt-5 w-full" onClick={() => track("cta_clicked", { place: "calculator", people, spend })} data-testid="calc-cta">
        {cta}
      </Link>
      <p className="mt-4 text-xs leading-relaxed text-fg-faint">{copy.footnote}</p>
    </section>
  );
}
