import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { googleAuthEnabled } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      <Link href="/" aria-label="Cartfull home" className="self-start">
        <Logo />
      </Link>
      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[2rem] sm:text-4xl">Save your week</h1>
        <p className="mt-3 text-ink-soft">
          Enter your email and we&apos;ll send a sign-in link. No password to remember.
        </p>
        <LoginForm next={next} googleEnabled={googleAuthEnabled} linkError={params.error === "link"} />
        <p className="mt-8 text-sm text-ink-faint">
          By continuing you agree to the <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
