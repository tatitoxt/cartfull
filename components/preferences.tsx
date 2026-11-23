"use client";

import type { ReactNode } from "react";
import { ALLERGENS, EQUIPMENT } from "@/lib/catalog/types";
import {
  BUDGET_MAX_CENTS,
  BUDGET_MIN_CENTS,
  type Answers,
} from "@/lib/app/profile";
import type { PantryGroups } from "@/lib/app/pantry";
import { COOK_TIMES, DIETS } from "@/lib/planner/types";
import { useLocale, useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";
import { moneyRound } from "@/lib/format";

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
  const m = useMessages();
  return (
    <div className="flex items-center justify-between gap-4" role="group" aria-label={label}>
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid size-12 place-items-center rounded-full bg-surface text-2xl leading-none shadow-[inset_0_0_0_1.5px_var(--color-line)] disabled:opacity-40"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={fill(m.preferences.fewer, { label })}
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
          aria-label={fill(m.preferences.more, { label })}
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
  const percent = ((cents - min) / (max - min)) * 100;
  const { lang } = useLocale();
  const m = useMessages();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output htmlFor={id} className="tnum font-display text-4xl font-semibold text-accent-deep">
          {moneyRound(cents, lang)}
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
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
        aria-valuetext={fill(m.preferences.perWeek, { amount: moneyRound(cents, lang) })}
      />
      <div className="tnum flex justify-between text-sm text-fg-faint" aria-hidden="true">
        <span>{moneyRound(min, lang)}</span>
        <span>{moneyRound(max, lang)}</span>
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
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                selected
                  ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]"
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
                className={`grid size-5 shrink-0 place-items-center rounded-full ${selected ? "bg-accent" : "shadow-[inset_0_0_0_1.5px_var(--color-fg-faint)]"}`}
              >
                {selected && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span>
                <span className="block font-semibold leading-tight">{option.label}</span>
                <span className="block text-sm text-fg-soft">{option.hint}</span>
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
      {hint && <p className="mt-1 text-sm text-fg-soft">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.key);
          const onClass =
            tone === "have"
              ? "bg-accent-soft text-accent-deep shadow-[inset_0_0_0_2px_var(--color-accent)]"
              : "bg-fg text-bg";
          return (
            <label
              key={option.key}
              className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full px-4 text-[0.95rem] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
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
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 shadow-[inset_0_0_0_1.5px_var(--color-line)] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
      <span>
        <span className="block font-semibold leading-tight">{label}</span>
        {hint && <span className="block text-sm text-fg-soft">{hint}</span>}
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
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5"
      />
    </label>
  );
}

const toggleIn = <T extends string>(list: readonly T[], key: T): T[] =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export function BudgetFields({ answers, set }: { answers: Answers; set: SetAnswers }) {
  const m = useMessages();
  return (
    <div className="space-y-8">
      <BudgetSlider
        id="budget"
        label={m.preferences.weeklyBudget}
        cents={answers.weekly_budget_cents}
        onChange={(cents) => set({ weekly_budget_cents: cents })}
      />
      <Stepper
        label={m.preferences.peopleEating}
        value={answers.household_size}
        min={1}
        max={8}
        onChange={(household_size) => set({ household_size })}
        unit={(n) => n === 1 ? m.common.person : fill(m.common.people, { count: n })}
      />
    </div>
  );
}

export function UsualSpendField({ answers, set }: { answers: Answers; set: SetAnswers }) {
  const m = useMessages();
  return (
    <div>
      <label htmlFor="usual" className="font-medium">
        {m.preferences.usualSpend}
      </label>
      <p id="usual-hint" className="mt-1 text-sm text-fg-soft">
        {m.preferences.spendHint}
      </p>
      <div className="relative mt-3 max-w-48">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-soft">$</span>
        <input
          id="usual"
          inputMode="numeric"
          className="field tnum pl-8"
          aria-describedby="usual-hint"
          placeholder={m.preferences.spendPlaceholder}
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
  const m = useMessages();
  return (
    <div className="space-y-8">
      <ChoiceCards
        legend={m.preferences.howEat}
        name="diet"
        value={answers.diet}
        options={DIETS.map((value) => ({ value, ...m.preferences.diets[value] }))}
        onChange={(diet) => set({ diet })}
      />
      <ChoiceCards
        legend={m.preferences.cookTime}
        name="cook_time"
        value={answers.cook_time}
        options={COOK_TIMES.map((value) => ({ value, ...m.preferences.cookTimes[value] }))}
        onChange={(cook_time) => set({ cook_time })}
      />
      <fieldset>
        <legend className="font-medium">{m.preferences.dinners}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle
            label={m.preferences.lunches}
            hint={m.preferences.threeRepeated}
            checked={answers.include_lunch}
            onChange={(include_lunch) => set({ include_lunch })}
          />
          <Toggle
            label={m.preferences.breakfasts}
            hint={m.preferences.threeRepeated}
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
  dislikeOptions: { key: string }[];
}) {
  const m = useMessages();
  return (
    <div className="space-y-8">
      <Chips
        legend={m.preferences.allergies}
        hint={m.preferences.allergiesHint}
        options={ALLERGENS.map((key) => ({ key, label: m.preferences.allergens[key] }))}
        selected={answers.allergens}
        onToggle={(key) => set({ allergens: toggleIn(answers.allergens, key as (typeof ALLERGENS)[number]) })}
      />
      <Chips
        legend={m.preferences.dislikesTitle}
        options={dislikeOptions.map(({ key }) => ({ key, label: m.preferences.dislikes[key as keyof typeof m.preferences.dislikes] ?? key }))}
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
  const m = useMessages();
  const { lang } = useLocale();
  const toggle = (key: string) => set({ pantry: toggleIn(answers.pantry, key) });
  const toggleEquipment = (key: string) => set({ equipment: toggleIn(answers.equipment, key as (typeof EQUIPMENT)[number]) });
  return (
    <div className="space-y-8">
      <Chips
        legend={m.preferences.appliances}
        hint={m.preferences.appliancesHint}
        options={EQUIPMENT.map((key) => ({ key, label: m.preferences.equipment[key] }))}
        selected={answers.equipment}
        onToggle={toggleEquipment}
        tone="have"
      />
      <Chips
        legend={m.preferences.kitchenNow}
        hint={m.preferences.pantryHint}
        options={pantry.common.map((item) => ({ key: item.id, label: lang === "es" && item.name_es ? item.name_es : item.name }))}
        selected={answers.pantry}
        onToggle={toggle}
        tone="have"
      />
      {children}
      <details className="group rounded-2xl bg-surface px-4 py-1 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
          <span>
            {m.preferences.basics}
            <span className="block text-sm font-normal text-fg-soft">{m.preferences.basicsHint}</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
            <path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="space-y-6 pb-4 pt-2">
          {pantry.basics.map((group) => (
            <Chips
              key={group.key}
              legend={m.preferences.pantryGroups[group.key]}
              options={group.items.map((item) => ({ key: item.id, label: lang === "es" && item.name_es ? item.name_es : item.name }))}
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
