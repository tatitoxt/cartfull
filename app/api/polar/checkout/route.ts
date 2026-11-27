import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { TRIAL_DAYS, hasAccess, hasEnded, type BillingInterval } from "@/lib/billing/plans";
import { getPolar, productId, firstMonthDiscountId } from "@/lib/billing/polar";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login?next=/app/upgrade`, 303);

  const form = await request.formData();
  const interval: BillingInterval = form.get("interval") === "monthly" ? "monthly" : "annual";

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("billing_customer_id, billing_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (hasAccess(existing?.status)) return NextResponse.redirect(`${siteUrl}/app/account`, 303);

  const polar = getPolar();
  if (existing?.billing_customer_id && existing?.billing_subscription_id && !hasEnded(existing.status)) {
    // Polar can still collect on this subscription (a failed renewal, for example).
    // Fixing the card there avoids selling a second one that would also be charged.
    const session = await polar.customerSessions.create({
      external_customer_id: user.id,
      return_url: `${siteUrl}/app/account`,
    });
    return NextResponse.redirect(session.customer_portal_url, 303);
  }

  // The trial is for first-time subscribers only — including people whose
  // previous account was deleted (a fresh account doesn't reset trial history).
  let usedBefore = !!existing?.billing_subscription_id;
  if (!usedBefore && user.email) {
    const { data: deleted } = await admin
      .from("deleted_accounts")
      .select("email")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    usedBefore = !!deleted;
  }
  // First-month offer: monthly plan only, first-time subscribers only.
  const introDiscount = interval === "monthly" && !usedBefore ? firstMonthDiscountId() : null;
  const checkout = await polar.checkouts.create({
    products: [productId(interval)],
    external_customer_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: { user_id: user.id },
    ...(usedBefore ? { allow_trial: false } : { trial_interval: "day" as const, trial_interval_count: TRIAL_DAYS }),
    ...(introDiscount ? { discount_id: introDiscount, allow_discount_codes: false } : { allow_discount_codes: true }),
    success_url: `${siteUrl}/app/welcome?checkout_id={CHECKOUT_ID}`,
    return_url: `${siteUrl}/app/upgrade?canceled=1`,
  });
  if (!checkout.url) return NextResponse.redirect(`${siteUrl}/app/upgrade?error=billing`, 303);
  return NextResponse.redirect(checkout.url, 303);
}
