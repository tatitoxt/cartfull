import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { googleAuthEnabled } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getLocale();
  return { title: MESSAGES[lang].metadata.login, robots: { index: false } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { lang } = await getLocale();
  const m = MESSAGES[lang];
  const next = safeNext(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      <Link href="/" aria-label={m.common.home} className="self-start">
        <Logo />
      </Link>
      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[2rem] sm:text-4xl">{m.login.title}</h1>
        <p className="mt-3 text-fg-soft">{m.login.lead}</p>
        <LoginForm next={next} googleEnabled={googleAuthEnabled} linkError={params.error === "link"} />
        <p className="mt-8 text-sm text-fg-faint">
          {m.login.termsLead} <Link href="/terms" className="underline underline-offset-2">{m.login.terms}</Link> {m.login.and}{" "}
          <Link href="/privacy" className="underline underline-offset-2">{m.login.privacy}</Link>.
        </p>
      </main>
    </div>
  );
}
