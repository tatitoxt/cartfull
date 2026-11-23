import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { completeLink, readPendingLink } from "@/lib/auth/complete-link";
import { normalizeEmail, PENDING_COOKIE } from "@/lib/auth/requested";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false } };

const retry = (next: string) => `/login?error=link&next=${encodeURIComponent(next)}`;

export default async function ConfirmPage() {
  const pending = readPendingLink((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect(retry("/app"));
  const next = safeNext(pending.next);
  const email = normalizeEmail(pending.email);

  async function finish() {
    "use server";
    const store = await cookies();
    const link = readPendingLink(store.get(PENDING_COOKIE)?.value);
    store.set(PENDING_COOKIE, "", { path: "/auth", maxAge: 0 });
    if (!link) redirect(retry("/app"));
    const signedIn = await completeLink(link.tokenHash, link.type, normalizeEmail(link.email));
    redirect(signedIn ? safeNext(link.next) : retry(safeNext(link.next)));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      <Link href="/" aria-label="Cartfull home" className="self-start">
        <Logo />
      </Link>
      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[2rem] sm:text-4xl">Is this your email?</h1>
        <p className="mt-3 text-ink-soft">
          This link signs in to Cartfull as{" "}
          <span className="font-medium text-ink" data-testid="confirm-email">
            {email}
          </span>
          . It was opened in a browser that didn&apos;t ask for it, so we&apos;re checking first.
        </p>
        <form action={finish} className="mt-8">
          <button type="submit" className="btn btn-primary w-full">
            Yes, sign me in
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-soft">
          Not your address? Don&apos;t continue: anything you save would go to someone else&apos;s account.{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-green underline underline-offset-4">
            Sign in with your own email
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
