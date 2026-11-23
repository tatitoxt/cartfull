"use client";

import type { ReactNode } from "react";
import { ALLERGENS } from "@/lib/catalog/types";
import {
  ALLERGEN_LABELS,
  BUDGET_MAX_CENTS,
  BUDGET_MIN_CENTS,
  COOK_TIME_LABELS,
  DIET_LABELS,
  type Answers,
} from "@/lib/app/profile";
import type { PantryGroups } from "@/lib/app/pantry";
import { COOK_TIMES, DIETS } from "@/lib/planner/types";

export type SetAnswers = (patch: Partial<Answers>) => void;

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit: (value: number) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-4" role="group" aria-label={label}>
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid size-12 place-items-center rounded-full bg-surface text-2xl leading-none shadow-[inset_0_0_0_1.5px_var(--color-line)] disabled:opacity-40"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer: ${label}`}
        >
          −
        </button>
        <output className="tnum min-w-24 text-center text-lg font-semibold" aria-live="polite">
          {unit(value)}
        </output>
        <button
          type="button"
          className="grid size-12 place-items-center rounded-full bg-surface text-2xl leading-none shadow-[inset_0_0_0_1.5px_var(--color-line)] disabled:opacity-40"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More: ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function BudgetSlider({
  id,
  label,
  cents,
  min = BUDGET_MIN_CENTS,
  max = BUDGET_MAX_CENTS,
  onChange,
}: {
  id: string;
  label: string;
  cents: number;
  min?: number;
  max?: number;
  onChange: (cents: number) => void;
}) {
  const fill = ((cents - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output htmlFor={id} className="tnum font-display text-4xl font-semibold text-green-deep">
          ${Math.round(cents / 100)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="slider mt-2"
        min={min / 100}
        max={max / 100}
        step={5}
        value={Math.round(cents / 100)}
        onChange={(e) => onChange(Number(e.target.value) * 100)}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        aria-valuetext={`$${Math.round(cents / 100)} a week`}
      />
      <div className="tnum flex justify-between text-sm text-ink-faint" aria-hidden="true">
        <span>${min / 100}</span>
        <span>${max / 100}</span>
      </div>
    </div>
  );
}

export function ChoiceCards<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="font-medium">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green ${
                selected
                  ? "bg-mint-soft shadow-[inset_0_0_0_2px_var(--color-green)]"
                  : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line)]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full ${selected ? "bg-green" : "shadow-[inset_0_0_0_1.5px_var(--color-ink-faint)]"}`}
              >
                {selected && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span>
                <span className="block font-semibold leading-tight">{option.label}</span>
                <span className="block text-sm text-ink-soft">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Chips({
  legend,
  hint,
  options,
  selected,
  onToggle,
  tone = "avoid",
}: {
  legend: string;
  hint?: string;
  options: { key: string; label: string }[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** "avoid" marks things to leave out, "have" marks things on hand. */
  tone?: "avoid" | "have";
}) {
  return (
    <fieldset>
      <legend className="font-medium">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.key);
          const onClass =
            tone === "have"
              ? "bg-mint-soft text-green-deep shadow-[inset_0_0_0_2px_var(--color-green)]"
              : "bg-ink text-paper";
          return (
            <label
              key={option.key}
              className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full px-4 text-[0.95rem] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green ${
                on ? onClass : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line)]"
              }`}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(option.key)} />
              {on && (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  {tone === "have" ? (
                    <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  )}
                </svg>
              )}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 shadow-[inset_0_0_0_1.5px_var(--color-line)] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green">
      <span>
        <span className="block font-semibold leading-tight">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-green peer-checked:after:translate-x-5"
      />
    </label>
  );
}

const toggleIn = <T extends string>(list: readonly T[], key: T): T[] =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export function BudgetFields({ answers, set }: { answers: Answers; set: SetAnswers }) {
  return (
    <div className="space-y-8">
      <BudgetSlider
        id="budget"
        label="Weekly grocery budget"
        cents={answers.weekly_budget_cents}
        onChange={(cents) => set({ weekly_budget_cents: cents })}
      />
      <Stepper
        label="People eating"
        value={answers.household_size}
        min={1}
        max={8}
        onChange={(household_size) => set({ household_size })}
        unit={(n) => (n === 1 ? "1 person" : `${n} people`)}
      />
    </div>
  );
}

export function UsualSpendField({ answers, set }: { answers: Answers; set: SetAnswers }) {
  return (
    <div>
      <label htmlFor="usual" className="font-medium">
        What do you usually spend a week?
      </label>
      <p id="usual-hint" className="mt-1 text-sm text-ink-soft">
        We compare each week against this to show what you saved. A rough number is fine.
      </p>
      <div className="relative mt-3 max-w-48">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
        <input
          id="usual"
          inputMode="numeric"
          className="field tnum pl-8"
          aria-describedby="usual-hint"
          placeholder="e.g. 180"
          value={answers.usual_spend_cents === null ? "" : String(Math.round(answers.usual_spend_cents / 100))}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
            set({ usual_spend_cents: digits ? Math.max(10, Number(digits)) * 100 : null });
          }}
        />
      </div>
    </div>
  );
}

export function MealFields({ answers, set }: { answers: Answers; set: SetAnswers }) {
  return (
    <div className="space-y-8">
      <ChoiceCards
        legend="How do you eat?"
        name="diet"
        value={answers.diet}
        options={DIETS.map((value) => ({ value, ...DIET_LABELS[value] }))}
        onChange={(diet) => set({ diet })}
      />
      <ChoiceCards
        legend="How much time do you have to cook?"
        name="cook_time"
        value={answers.cook_time}
        options={COOK_TIMES.map((value) => ({ value, ...COOK_TIME_LABELS[value] }))}
        onChange={(cook_time) => set({ cook_time })}
      />
      <fieldset>
        <legend className="font-medium">Dinners are always planned. Add more?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle
            label="Lunches"
            hint="Three recipes, repeated"
            checked={answers.include_lunch}
            onChange={(include_lunch) => set({ include_lunch })}
          />
          <Toggle
            label="Breakfasts"
            hint="Three recipes, repeated"
            checked={answers.include_breakfast}
            onChange={(include_breakfast) => set({ include_breakfast })}
          />
        </div>
      </fieldset>
    </div>
  );
}

export function AvoidFields({
  answers,
  set,
  dislikeOptions,
}: {
  answers: Answers;
  set: SetAnswers;
  dislikeOptions: { key: string; label: string }[];
}) {
  return (
    <div className="space-y-8">
      <Chips
        legend="Any allergies?"
        hint="Recipes containing these are never planned."
        options={ALLERGENS.map((key) => ({ key, label: ALLERGEN_LABELS[key] }))}
        selected={answers.allergens}
        onToggle={(key) => set({ allergens: toggleIn(answers.allergens, key as (typeof ALLERGENS)[number]) })}
      />
      <Chips
        legend="Anything you won't eat?"
        options={dislikeOptions}
        selected={answers.dislikes}
        onToggle={(key) => set({ dislikes: toggleIn(answers.dislikes, key) })}
      />
    </div>
  );
}

export function PantryFields({
  answers,
  set,
  pantry,
  children,
}: {
  answers: Answers;
  set: SetAnswers;
  pantry: PantryGroups;
  children?: ReactNode;
}) {
  const toggle = (key: string) => set({ pantry: toggleIn(answers.pantry, key) });
  return (
    <div className="space-y-8">
      <Chips
        legend="In your kitchen right now"
        hint="Tick what you have. It comes off the cart, so the same budget buys more."
        options={pantry.common.map((item) => ({ key: item.id, label: item.name }))}
        selected={answers.pantry}
        onToggle={toggle}
        tone="have"
      />
      {children}
      <details className="group rounded-2xl bg-surface px-4 py-1 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
          <span>
            Basics we assume you have
            <span className="block text-sm font-normal text-ink-soft">Salt, oil, spices. Untick anything you&apos;re out of.</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
            <path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="space-y-6 pb-4 pt-2">
          {pantry.basics.map((group) => (
            <Chips
              key={group.title}
              legend={group.title}
              options={group.items.map((item) => ({ key: item.id, label: item.name }))}
              selected={answers.pantry}
              onToggle={toggle}
              tone="have"
            />
          ))}
        </div>
      </details>
    </div>
  );
}
