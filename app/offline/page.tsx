import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Logo />
      <h1 className="mt-8 text-4xl">You&apos;re offline</h1>
      <p className="mt-3 text-ink-soft">
        This page hasn&apos;t been saved on this device yet. Your grocery list is available offline once you&apos;ve opened it
        with a connection.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Plain links: a full page load lets the saved copy be served. */}
        <a href="/app/list" className="btn btn-primary">
          Open grocery list
        </a>
        <a href="/app/plan" className="btn btn-quiet">
          Try again
        </a>
      </div>
    </main>
  );
}
