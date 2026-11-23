"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/components/analytics";
import { Logo } from "@/components/logo";
import {
  AvoidFields,
  BudgetFields,
  MealFields,
  PantryFields,
  UsualSpendField,
} from "@/components/preferences";
import { completeOnboarding } from "@/lib/app/actions";
import type { PantryGroups } from "@/lib/app/pantry";
import { BUDGET_MAX_CENTS, BUDGET_MIN_CENTS, DEFAULTS, answersSchema, type Answers } from "@/lib/app/profile";

const STORAGE_KEY = "cartfull.answers.v1";
const STEPS = ["Budget", "Meals", "Avoid", "Kitchen"] as const;

const TITLES = [
  { title: "What can you spend on groceries this week?", lead: "Set the number. We plan to it and never go over." },
  { title: "What should the week look like?", lead: "Pick what fits. You can change it any time." },
  { title: "Anything to leave out?", lead: "Skip this if you eat everything." },
  { title: "What do you already have?", lead: "Food at home costs nothing this week." },
];

type Estimate =
  | { state: "loading" }
  | { state: "ready"; minimumCents: number; typicalCents: number }
  | { state: "none"; slot: string }
  | { state: "error" };

function initialAnswers(staples: string[], params: URLSearchParams): Answers {
  const base: Answers = {
    ...DEFAULTS,
    equipment: [...DEFAULTS.equipment],
    usual_spend_cents: null,
    allergens: [],
    dislikes: [],
    pantry: staples,
  };
  const number = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const people = number("people");
  const spend = number("spend");
  const budget = number("budget");
  if (people) base.household_size = Math.min(8, Math.max(1, Math.round(people)));
  if (spend) base.usual_spend_cents = Math.min(3000, Math.max(10, Math.round(spend))) * 100;
  if (budget) {
    const cents = Math.round(budget / 5) * 500;
    base.weekly_budget_cents = Math.min(BUDGET_MAX_CENTS, Math.max(BUDGET_MIN_CENTS, cents));
  }
  return base;
}

function Flow({
  signedIn,
  pantry,
  staples,
  dislikeOptions,
}: {
  signedIn: boolean;
  pantry: PantryGroups;
  staples: string[];
  dislikeOptions: { key: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(staples, new URLSearchParams(params)));
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; minimumCents?: number } | null>(null);
  const [estimate, setEstimate] = useState<Estimate>({ state: "loading" });
  const heading = useRef<HTMLHeadingElement>(null);
  const autoSubmitted = useRef(false);

  const set = useCallback((patch: Partial<Answers>) => {
    setProblem(null);
    setAnswers((current) => ({ ...current, ...patch }));
  }, []);

  const submit = useCallback(
    async (payload: Answers) => {
      setBusy(true);
      setProblem(null);
      if (!signedIn) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        track("onboarding_answers_ready");
        router.push(`/login?next=${encodeURIComponent("/start?finish=1")}`);
        return;
      }
      const result = await completeOnboarding(payload);
      if (result.ok) {
        localStorage.removeItem(STORAGE_KEY);
        track("onboarding_completed_client");
        router.replace("/app/plan");
        return;
      }
      setBusy(false);
      if (result.code === "budget_too_low") {
        setStep(0);
        setProblem({ message: result.message, minimumCents: result.minimumCents });
      } else {
        if (result.code === "not_enough_recipes") setStep(2);
        setProblem({ message: result.message });
      }
    },
    [router, signedIn],
  );

  // Restore answers saved before signing in, and finish the flow after the sign-in round trip.
  useEffect(() => {
    let restored: Answers | null = null;
    try {
      const parsed = answersSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
      if (parsed.success) restored = parsed.data;
    } catch {
      // ignore unreadable storage
    }
    if (restored) {
      setAnswers(restored);
      if (params.get("finish") === "1" && signedIn && !autoSubmitted.current) {
        autoSubmitted.current = true;
        setStep(STEPS.length - 1);
        void submit(restored);
      }
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estimateKey = useMemo(
    () =>
      JSON.stringify({
        household_size: answers.household_size,
        diet: answers.diet,
        cook_time: answers.cook_time,
        include_breakfast: answers.include_breakfast,
        include_lunch: answers.include_lunch,
        allergens: answers.allergens,
        dislikes: answers.dislikes,
        pantry: answers.pantry,
      }),
    [answers],
  );

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/estimate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: estimateKey,
          signal: controller.signal,
        });
        const data = await response.json();
        if (data.error === "not_enough_recipes") setEstimate({ state: "none", slot: data.slot });
        else if (!response.ok || data.error) setEstimate({ state: "error" });
        else setEstimate({ state: "ready", minimumCents: data.minimumCents, typicalCents: data.typicalCents });
      } catch (error) {
        if ((error as Error).name !== "AbortError") setEstimate({ state: "error" });
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [estimateKey, ready]);

  const go = (next: number) => {
    setStep(next);
    setProblem(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus());
  };

  const last = step === STEPS.length - 1;
  const tooLow = estimate.state === "ready" && answers.weekly_budget_cents < estimate.minimumCents;
  const blocked = tooLow || estimate.state === "none";
  const leanest = estimate.state === "ready" ? Math.ceil(estimate.minimumCents / 500) * 500 : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-40 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Cartfull home">
          <Logo />
        </Link>
        <p className="tnum text-sm font-medium text-ink-soft" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </p>
      </header>

      <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((name, index) => (
          <li key={name} className={`h-1.5 rounded-full ${index <= step ? "bg-green" : "bg-line"}`} />
        ))}
      </ol>

      <main id="main" className="mt-8 flex-1">
        <div key={step} className="rise">
          <h1 ref={heading} tabIndex={-1} className="text-[1.9rem] outline-none sm:text-4xl">
            {TITLES[step].title}
          </h1>
          <p className="mt-3 text-ink-soft">{TITLES[step].lead}</p>

          <div className="mt-8">
            {step === 0 && (
              <div className="space-y-8">
                <BudgetFields answers={answers} set={set} />
                <UsualSpendField answers={answers} set={set} />
              </div>
            )}
            {step === 1 && <MealFields answers={answers} set={set} />}
            {step === 2 && <AvoidFields answers={answers} set={set} dislikeOptions={dislikeOptions} />}
            {step === 3 && <PantryFields answers={answers} set={set} pantry={pantry} />}
          </div>
        </div>

        {problem && (
          <div role="alert" className="mt-6 rounded-2xl bg-yellow-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-yellow)]">
            <p className="font-medium">{problem.message}</p>
            {problem.minimumCents && (
              <button
                type="button"
                className="mt-3 font-semibold text-green-deep underline underline-offset-4"
                onClick={() => set({ weekly_budget_cents: Math.min(BUDGET_MAX_CENTS, Math.ceil(problem.minimumCents! / 500) * 500) })}
              >
                Set my budget to ${Math.ceil(problem.minimumCents / 500) * 5}
              </button>
            )}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-5">
          <p className="min-h-12 text-[0.95rem] leading-snug" aria-live="polite" data-testid="estimate">
            {estimate.state === "loading" && <span className="text-ink-faint">Pricing a week for your household…</span>}
            {estimate.state === "error" && <span className="text-ink-faint">We&apos;ll price the week when you finish.</span>}
            {estimate.state === "none" && (
              <span className="font-medium">
                Not enough {estimate.slot} recipes fit these choices.{" "}
                <span className="font-normal text-ink-soft">Loosen your diet, allergies or dislikes.</span>
              </span>
            )}
            {estimate.state === "ready" && tooLow && (
              <span>
                <span className="font-semibold">${Math.round(answers.weekly_budget_cents / 100)} is too tight for this week.</span>{" "}
                <span className="text-ink-soft">The leanest plan we can build is about </span>
                <button
                  type="button"
                  className="tnum font-semibold text-green-deep underline underline-offset-2"
                  onClick={() => set({ weekly_budget_cents: Math.min(BUDGET_MAX_CENTS, leanest!) })}
                >
                  ${leanest! / 100}
                </button>
                .
              </span>
            )}
            {estimate.state === "ready" && !tooLow && (
              <BudgetLine budget={answers.weekly_budget_cents} typical={estimate.typicalCents} minimum={estimate.minimumCents} />
            )}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {step > 0 && (
              <button type="button" className="btn btn-quiet px-5" onClick={() => go(step - 1)} disabled={busy}>
                Back
              </button>
            )}
            {last ? (
              <button
                type="button"
                className="btn btn-cta flex-1"
                onClick={() => submit(answers)}
                disabled={busy || blocked}
              >
                {busy ? "Planning your week…" : "Plan my week"}
              </button>
            ) : (
              <button type="button" className="btn btn-primary flex-1" onClick={() => go(step + 1)}>
                Continue
              </button>
            )}
          </div>
          {!last && step > 0 && (
            <button
              type="button"
              className="mx-auto mt-1 block min-h-11 px-3 text-sm font-medium text-ink-soft underline underline-offset-4"
              onClick={() => go(step + 1)}
            >
              Skip this step
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetLine({ budget, typical, minimum }: { budget: number; typical: number; minimum: number }) {
  const need = Math.min(budget, Math.max(minimum, typical));
  const left = budget - need;
  return (
    <span>
      <span className="text-ink-soft">These meals need about </span>
      <span className="tnum font-semibold">${Math.round(need / 100)}</span>
      {left >= 100 ? (
        <>
          <span className="text-ink-soft">. That leaves </span>
          <span className="tnum font-semibold text-tomato-deep">${Math.round(left / 100)}</span>
          <span className="text-ink-soft"> for everything else.</span>
        </>
      ) : (
        <span className="text-ink-soft">. It fits, with little to spare.</span>
      )}
    </span>
  );
}

export function Onboarding(props: React.ComponentProps<typeof Flow>) {
  return (
    <Suspense fallback={null}>
      <Flow {...props} />
    </Suspense>
  );
}
