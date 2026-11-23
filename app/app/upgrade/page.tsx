import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PricingChoice } from "@/components/pricing-choice";
import { getEntitlement, getProfile, requireSession } from "@/lib/app/data";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const session = await requireSession("/app/upgrade");
  const profile = await getProfile(session);
  return { title: MESSAGES[profile.lang].metadata.upgrade };
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession("/app/upgrade");
  const [entitlement, profile] = await Promise.all([getEntitlement(session), getProfile(session)]);
  const m = MESSAGES[profile.lang];
  if (entitlement.active) redirect("/app/account");
  const trial = !entitlement.hadSubscription;

  return (
    <section className="mx-auto max-w-xl py-4">
      <h1 className="text-4xl sm:text-5xl">{trial ? m.billing.title : m.billing.welcome}</h1>
      <p className="mt-3 text-fg-soft">
        {trial ? m.billing.trialLead : m.billing.returnLead}
      </p>
      {params.canceled && (
        <p role="status" className="mt-5 rounded-2xl bg-bg-deep p-4">
          {m.billing.canceled}
        </p>
      )}
      {params.error && (
        <p role="alert" className="mt-5 rounded-2xl bg-over-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-over)]">
          {m.billing.error}
        </p>
      )}
      <PricingChoice mode="checkout" trial={trial} />
    </section>
  );
}
