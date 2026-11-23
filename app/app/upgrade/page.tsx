import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PricingChoice } from "@/components/pricing-choice";
import { getEntitlement, requireSession } from "@/lib/app/data";

export const metadata: Metadata = { title: "Start your free trial" };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession("/app/upgrade");
  const entitlement = await getEntitlement(session);
  if (entitlement.active) redirect("/app/account");
  const trial = !entitlement.hadSubscription;

  return (
    <section className="mx-auto max-w-xl py-4">
      <h1 className="text-4xl sm:text-5xl">{trial ? "Keep the plans coming" : "Welcome back"}</h1>
      <p className="mt-3 text-ink-soft">
        {trial
          ? "Your first week was free. Try the full app for 7 days: a new plan and priced list every week, swaps, and your savings history."
          : "Subscribe again to open your saved weeks and plan the next one."}
      </p>
      {params.canceled && (
        <p role="status" className="mt-5 rounded-2xl bg-paper-deep p-4">
          Checkout was canceled. Nothing was charged.
        </p>
      )}
      {params.error && (
        <p role="alert" className="mt-5 rounded-2xl bg-yellow-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-yellow)]">
          We couldn&apos;t reach the payment page. Try again in a moment.
        </p>
      )}
      <PricingChoice mode="checkout" trial={trial} />
    </section>
  );
}
