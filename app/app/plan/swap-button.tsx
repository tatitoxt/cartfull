"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { track } from "@/components/analytics";
import { Photo } from "@/components/photo";
import { keepForOffline } from "@/components/service-worker";
import { getSwapChoices, swapMeal, type SwapChoice } from "@/lib/app/actions";
import type { MealType } from "@/lib/catalog/types";
import { money } from "@/lib/format";

export function SwapButton({
  planId,
  day,
  slot,
  currentName,
  compact = false,
}: {
  planId: string;
  day: number;
  slot: MealType;
  currentName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<SwapChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () => {
    setChoices(null);
    setError(null);
    dialog.current?.showModal();
    start(async () => setChoices(await getSwapChoices(planId, day, slot)));
  };

  const choose = (slug: string) =>
    start(async () => {
      const result = await swapMeal(planId, day, slot, slug);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      track("meal_swapped", { slot });
      dialog.current?.close();
      router.refresh();
      keepForOffline();
    });

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          compact
            ? "min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-green-deep underline underline-offset-4"
            : "mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-green-deep shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:bg-paper-deep"
        }
        aria-label={`Swap ${currentName}`}
        data-testid="swap-button"
      >
        Swap
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-card bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/40"
        aria-label={`Swap ${currentName}`}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="max-h-[85dvh] overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl">Swap this meal</h2>
              <p className="mt-1 text-sm text-ink-soft">Every option keeps your cart within budget.</p>
            </div>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper-deep"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-tomato-deep">
              {error}
            </p>
          )}
          {choices === null && <p className="py-10 text-center text-ink-soft">Finding meals that fit…</p>}
          {choices?.length === 0 && (
            <p className="py-8 text-ink-soft">
              Nothing else fits this week&apos;s budget and preferences. Raise the budget or loosen a preference in Account.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {choices?.map((choice) => (
              <li key={choice.slug}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(choice.slug)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2 pr-4 text-left shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:shadow-[inset_0_0_0_2px_var(--color-green)] disabled:opacity-60"
                  data-testid="swap-choice"
                >
                  <Photo url={choice.photoUrl} alt="" ratio={1} sizes="64px" className="size-16 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{choice.name}</span>
                    <span className="tnum block text-sm text-ink-soft">{choice.prepMinutes} min</span>
                  </span>
                  <span className={`tnum shrink-0 text-sm font-semibold ${choice.deltaCents < 0 ? "text-tomato-deep" : "text-ink-soft"}`}>
                    {choice.deltaCents === 0
                      ? "Same cart"
                      : choice.deltaCents < 0
                        ? `Saves ${money(-choice.deltaCents)}`
                        : `+${money(choice.deltaCents)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
