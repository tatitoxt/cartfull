"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/components/analytics";
import {
  AvoidFields,
  BudgetFields,
  MealFields,
  PantryFields,
  UsualSpendField,
  Toggle,
} from "@/components/preferences";
import { saveSettings } from "@/lib/app/actions";
import type { PantryGroups } from "@/lib/app/pantry";
import type { Answers } from "@/lib/app/profile";
import { CountryPreferences } from "@/components/country-preferences";
import { useMessages } from "@/lib/i18n/locale-provider";

export function SettingsForm({
  initial,
  pantry,
  dislikeOptions,
}: {
  initial: Answers;
  pantry: PantryGroups;
  dislikeOptions: { key: string }[];
}) {
  const router = useRouter();
  const m = useMessages();
  const [answers, setAnswers] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = (patch: Partial<Answers>) => {
    setDirty(true);
    setMessage(null);
    setAnswers((current) => ({ ...current, ...patch }));
  };

  const save = () =>
    start(async () => {
      const result = await saveSettings(answers);
      if (result.ok) {
        setDirty(false);
        setMessage({ ok: true, text: m.account.saveSuccess });
        track("settings_saved");
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });

  const sections = [
    { id: "country", title: m.account.countryLanguage, body: <CountryPreferences answers={answers} set={set} /> },
    { id: "budget", title: m.account.budget, body: (
        <div className="space-y-8">
          <BudgetFields answers={answers} set={set} />
          <UsualSpendField answers={answers} set={set} />
        </div>
      ) },
    { id: "meals", title: m.account.meals, body: <MealFields answers={answers} set={set} /> },
    { id: "avoid", title: m.account.leaveOut, body: <AvoidFields answers={answers} set={set} dislikeOptions={dislikeOptions} /> },
    { id: "kitchen", title: m.account.kitchen, body: <PantryFields answers={answers} set={set} pantry={pantry} /> },
    { id: "reminders", title: m.account.reminders.title, body: (
        <div className="space-y-3">
          <Toggle
            label={m.account.reminders.plan}
            hint={m.account.reminders.planHint}
            checked={answers.notify_plan}
            onChange={(notify_plan) => set({ notify_plan })}
          />
          <Toggle
            label={m.account.reminders.shopping}
            hint={m.account.reminders.shoppingHint}
            checked={answers.notify_shopping}
            onChange={(notify_shopping) => set({ notify_shopping })}
          />
          <Toggle
            label={m.account.reminders.receipt}
            hint={m.account.reminders.receiptHint}
            checked={answers.notify_receipt}
            onChange={(notify_receipt) => set({ notify_receipt })}
          />
        </div>
      ) },
  ];

  return (
    <form
      className="mt-10"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`settings-${section.id}`} className="border-t border-line py-8">
          <h2 id={`settings-${section.id}`} className="text-2xl">
            {section.title}
          </h2>
          <div className="mt-5">{section.body}</div>
        </section>
      ))}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-card bg-bg/95 py-3 backdrop-blur sm:bottom-4">
        <button type="submit" className="btn btn-primary" disabled={pending || !dirty} data-testid="save-settings">
          {pending ? m.common.saving : m.common.save}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm font-medium ${message.ok ? "text-accent-deep" : "text-over-deep"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
