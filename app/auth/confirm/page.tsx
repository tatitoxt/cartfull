import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { completeLink } from "@/lib/auth/complete-link";
import { normalizeEmail } from "@/lib/auth/requested";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false } };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; email?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const email = normalizeEmail(params.email);
  const tokenHash = params.token_hash ?? "";
  const type = params.type;
  const retry = `/login?error=link&next=${encodeURIComponent(next)}`;
  if (!email || !tokenHash) redirect(retry);

  async function finish() {
    "use server";
    redirect((await completeLink(tokenHash, type, email)) ? next : retry);
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
