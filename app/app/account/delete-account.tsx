"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/app/actions";
import { useMessages } from "@/lib/i18n/locale-provider";

/** Two-step delete: the button shows the warning first, then asks for a second tap. */
export function DeleteAccount() {
  const m = useMessages();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming)
    return (
      <button type="button" className="btn btn-quiet text-over-deep" onClick={() => setConfirming(true)} data-testid="delete-account">
        {m.account.deleteButton}
      </button>
    );

  return (
    <div role="alert" className="space-y-3">
      <p className="text-sm font-medium">{m.account.deleteLead}</p>
      {error && <p className="text-sm text-over-deep">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-cta bg-over text-white"
          disabled={pending}
          data-testid="delete-account-confirm"
          onClick={() =>
            start(async () => {
              const result = await deleteAccount();
              if (result.ok) {
                router.push("/");
                router.refresh();
              } else setError(result.message);
            })
          }
        >
          {pending ? m.common.saving : m.account.deleteConfirm}
        </button>
        <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => setConfirming(false)}>
          {m.account.deleteCancel}
        </button>
      </div>
    </div>
  );
}
