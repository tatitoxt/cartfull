import Link from "next/link";
import { Logo } from "@/components/logo";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";

export default async function NotFound() {
  const m = MESSAGES[(await getLocale()).lang];
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Logo />
      <h1 className="mt-8 text-4xl">{m.misc.notFound}</h1>
      <p className="mt-3 text-ink-soft">{m.misc.moved}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app/plan" className="btn btn-primary">
          {m.common.goPlan}
        </Link>
        <Link href="/" className="btn btn-quiet">
          {m.misc.home}
        </Link>
      </div>
    </main>
  );
}
