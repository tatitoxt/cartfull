"use client";

import { useEffect } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const m = useMessages();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-4xl">{m.misc.somethingWrong}</h1>
      <p className="mt-3 text-ink-soft">{m.misc.safe}</p>
      {error.digest && <p className="mt-2 text-sm text-ink-faint">{fill(m.misc.reference, { id: error.digest })}</p>}
      <div className="mt-6">
        <button type="button" className="btn btn-primary" onClick={reset}>
          {m.common.tryAgain}
        </button>
      </div>
    </main>
  );
}
