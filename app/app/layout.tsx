import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AppNav } from "@/components/app-nav";
import { Identify } from "@/components/identify";
import { getProfile, requireSession } from "@/lib/app/data";
import { MESSAGES } from "@/lib/i18n/messages";

export const metadata: Metadata = { robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const profile = await getProfile(session);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-5 sm:pb-12">
      <header className="flex items-center justify-between gap-4">
        <Link href="/app/plan" aria-label={MESSAGES[profile.lang].common.thisWeek}>
          <Logo />
        </Link>
        <AppNav />
      </header>
      <main id="main" className="mt-7">
        {children}
      </main>
      <Identify userId={session.userId} />
    </div>
  );
}
