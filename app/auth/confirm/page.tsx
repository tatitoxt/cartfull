import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { completeLink, readPendingLink } from "@/lib/auth/complete-link";
import { normalizeEmail, PENDING_COOKIE } from "@/lib/auth/requested";
import { safeNext } from "@/lib/safe-next";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getLocale();
  return { title: MESSAGES[lang].misc.confirmTitle, robots: { index: false } };
}

const retry = (next: string) => `/login?error=link&next=${encodeURIComponent(next)}`;

export default async function ConfirmPage() {
  const pending = readPendingLink((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect(retry("/app"));
  const next = safeNext(pending.next);
  const email = normalizeEmail(pending.email);
  const m = MESSAGES[(await getLocale()).lang];

  async function finish() {
    "use server";
    const store = await cookies();
    const link = readPendingLink(store.get(PENDING_COOKIE)?.value);
    store.set(PENDING_COOKIE, "", { path: "/auth", maxAge: 0 });
    // Another link opened in this browser since this screen was drawn would sign in
    // a different account than the one shown here.
    if (!link || normalizeEmail(link.email) !== email) redirect(retry(next));
    const signedIn = await completeLink(link.tokenHash, link.type, normalizeEmail(link.email));
    redirect(signedIn ? safeNext(link.next) : retry(safeNext(link.next)));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      <Link href="/" aria-label={m.common.home} className="self-start">
        <Logo />
      </Link>
      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[2rem] sm:text-4xl">{m.misc.confirmTitle}</h1>
        <p className="mt-3 text-fg-soft">
          {m.misc.confirmLead}{" "}
          <span className="font-medium text-fg" data-testid="confirm-email">
            {email}
          </span>
          {m.misc.confirmOpened}
        </p>
        <form action={finish} className="mt-8">
          <button type="submit" className="btn btn-primary w-full">
            {m.misc.confirmButton}
          </button>
        </form>
        <p className="mt-6 text-sm text-fg-soft">
          {m.misc.confirmWrong}{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent underline underline-offset-4">
            {m.misc.confirmOwn}
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
