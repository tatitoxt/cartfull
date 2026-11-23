"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { track } from "@/components/analytics";
import { keepForOffline } from "@/components/service-worker";
import { toggleLeftover } from "@/lib/app/actions";
import type { MealType } from "@/lib/catalog/types";
import { useMessages } from "@/lib/i18n/locale-provider";

export function LeftoverToggle({
  planId,
  day,
  slot,
  leftover,
}: {
  planId: string;
  day: number;
  slot: MealType;
  leftover: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const m = useMessages();

  const toggle = () =>
    start(async () => {
      const result = await toggleLeftover(planId, day, slot);
      if (!result.ok) return;
      track("meal_leftover", { slot, on: !leftover });
      router.refresh();
      keepForOffline();
    });

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={leftover}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
        leftover
          ? "bg-accent text-accent-ink"
          : "border border-line text-fg-soft hover:border-accent hover:text-accent"
      }`}
    >
      {m.plan.leftovers}
    </button>
  );
}
