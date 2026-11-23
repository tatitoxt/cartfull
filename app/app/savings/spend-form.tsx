"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/components/analytics";
import { recordSpend } from "@/lib/app/actions";
import { useMessages } from "@/lib/i18n/locale-provider";

export function SpendForm({ planId, spentCents }: { planId: string; spentCents: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(spentCents === null ? "" : (spentCents / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const id = `spent-${planId}`;
  const m = useMessages();

  const save = (cents: number | null) =>
    start(async () => {
      setError(null);
      const result = await recordSpend(planId, cents);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (cents === null) setValue("");
      else track("spend_recorded");
      setSaved(true);
      router.refresh();
    });

  return (
    <form
      className="mt-5 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const amount = Number(value);
        if (!value.trim() || !Number.isFinite(amount) || amount < 0) {
          setError(m.savings.receiptError);
          return;
        }
        save(Math.round(amount * 100));
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {m.savings.spendPrompt}
      </label>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-fg-soft">
        <span
          aria-hidden="true"
          className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-[inset_0_0_0_1px_var(--color-line)]"
        >
          ?
        </span>
        {m.savings.spendHint}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative w-36">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-soft">$</span>
          <input
            id={id}
            className="field tnum pl-8"
            inputMode="decimal"
            placeholder={m.savings.spendPlaceholder}
            value={value}
            onChange={(e) => {
              setSaved(false);
              setValue(e.target.value.replace(/[^\d.]/g, "").slice(0, 8));
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <button type="submit" className="btn btn-quiet px-5" disabled={pending}>
          {pending ? m.common.saving : m.common.save}
        </button>
        {spentCents !== null && (
          <button type="button" className="min-h-11 px-2 text-sm font-medium text-fg-soft underline underline-offset-4" onClick={() => save(null)} disabled={pending}>
            {m.savings.clear}
          </button>
        )}
        {saved && !pending && (
          <span role="status" className="text-sm font-medium text-accent-deep">
            {m.common.saved}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-over-deep">
          {error}
        </p>
      )}
    </form>
  );
}
