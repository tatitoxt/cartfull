"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-4xl">Something went wrong on our side</h1>
      <p className="mt-3 text-ink-soft">Your plan and list are safe. Try again, and if it keeps happening email hello@cartfull.app.</p>
      {error.digest && <p className="mt-2 text-sm text-ink-faint">Reference: {error.digest}</p>}
      <div className="mt-6">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
