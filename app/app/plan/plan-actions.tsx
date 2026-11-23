"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/components/analytics";
import { keepForOffline } from "@/components/service-worker";
import { createNextWeek, regenerateWeek, type ActionResult } from "@/lib/app/actions";
import { useMessages } from "@/lib/i18n/locale-provider";

const COPY = {
  first: { className: "btn btn-cta mt-6" },
  next: { className: "btn btn-primary mt-4" },
  regenerate: { className: "btn btn-quiet" },
};

export function PlanActions({ mode, planId }: { mode: keyof typeof COPY; planId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<Exclude<ActionResult, { ok: true }> | null>(null);
  const m = useMessages();
  const copy = COPY[mode];
  const idle = mode === "first" ? m.onboarding.plan : mode === "next" ? m.plan.planNext : m.plan.newMix;
  const busy = mode === "first" ? m.onboarding.planning : mode === "next" ? m.plan.planningNext : m.plan.mixing;

  const run = () =>
    start(async () => {
      setProblem(null);
      const result = mode === "regenerate" && planId ? await regenerateWeek(planId) : await createNextWeek();
      if (result.ok) {
        track(mode === "regenerate" ? "plan_regenerated" : "plan_created");
        router.refresh();
        keepForOffline();
      } else if (result.code === "paywall") {
        router.push("/app/upgrade");
      } else {
        setProblem(result);
      }
    });

  return (
    <>
      <button type="button" className={copy.className} onClick={run} disabled={pending} data-testid={`plan-${mode}`}>
        {pending ? busy : idle}
      </button>
      {problem && (
        <p role="alert" className="mt-4 basis-full rounded-2xl bg-yellow-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-yellow)]">
          {problem.message}{" "}
          <a href="/app/account" className="font-semibold text-green-deep underline underline-offset-4">
            {m.plan.changePrefs}
          </a>
        </p>
      )}
    </>
  );
}
