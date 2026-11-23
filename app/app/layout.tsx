import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AppNav } from "@/components/app-nav";
import { TrialBanner } from "@/components/trial-banner";
import { Identify } from "@/components/identify";
import { getEntitlement, getProfile, requireSession } from "@/lib/app/data";
import { MESSAGES } from "@/lib/i18n/messages";

export const metadata: Metadata = { robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const profile = await getProfile(session);
  const entitlement = await getEntitlement(session);
  const m = MESSAGES[profile.lang];
  const daysLeft = entitlement.trialEnd
    ? Math.ceil((Date.parse(entitlement.trialEnd) - Date.now()) / 86_400_000)
    : null;
  const trialEnding =
    entitlement.status === "trialing" && daysLeft !== null && daysLeft >= 0 && daysLeft <= 4;
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-5">
      <header className="flex items-center justify-between gap-4">
        <Link href="/app/plan" aria-label={MESSAGES[profile.lang].common.thisWeek}>
          <Logo />
        </Link>
        <AppNav />
      </header>
      {trialEnding && (
        <TrialBanner
          trialEnd={entitlement.trialEnd as string}
          endsLabel={m.common.trialEndsSoon.replace(
            "{date}",
            new Date(entitlement.trialEnd as string).toLocaleDateString(
              profile.lang === "es" ? "es-ES" : "en-US",
              { month: "long", day: "numeric" },
            ),
          )}
          ctaLabel={m.common.trialEndsSoonCta}
          closeLabel={m.common.close}
        />
      )}
      <main id="main" className="mt-7">
        {children}
      </main>
      <Identify userId={session.userId} />
    </div>
  );
}
