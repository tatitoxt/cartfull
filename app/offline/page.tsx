import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getLocale();
  return { title: MESSAGES[lang].misc.offline, robots: { index: false } };
}

export default async function OfflinePage() {
  const m = MESSAGES[(await getLocale()).lang];
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Logo />
      <h1 className="mt-8 text-4xl">{m.misc.offline}</h1>
      <p className="mt-3 text-ink-soft">{m.misc.offlineLead}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Plain links: a full page load lets the saved copy be served. */}
        <a href="/app/list" className="btn btn-primary">
          {m.plan.openList}
        </a>
        <a href="/app/plan" className="btn btn-quiet">
          {m.common.tryAgain}
        </a>
      </div>
    </main>
  );
}
