import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { TRIAL_DAYS, hasAccess, hasEnded, type BillingInterval } from "@/lib/billing/plans";
import { getStripe, priceId } from "@/lib/billing/stripe";
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
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (hasAccess(existing?.status)) return NextResponse.redirect(`${siteUrl}/app/account`, 303);

  const stripe = getStripe();
  let customerId = existing?.stripe_customer_id ?? null;
  if (customerId && existing?.stripe_subscription_id && !hasEnded(existing.status)) {
    // Stripe can still collect on this subscription (a failed renewal, for example).
    // Fixing the card there avoids selling a second one that would also be charged.
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/app/account`,
    });
    return NextResponse.redirect(portal.url, 303);
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const { error } = await admin
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    if (error) return NextResponse.redirect(`${siteUrl}/app/upgrade?error=billing`, 303);
  }

  // The trial is for first-time subscribers only — including people whose
  // previous account was deleted (a fresh account doesn't reset trial history).
  let usedBefore = !!existing?.stripe_subscription_id;
  if (!usedBefore && user.email) {
    const { data: deleted } = await admin
      .from("deleted_accounts")
      .select("email")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    usedBefore = !!deleted;
  }
  const trial = usedBefore ? undefined : TRIAL_DAYS;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId(interval), quantity: 1 }],
    subscription_data: { trial_period_days: trial, metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${siteUrl}/app/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/app/upgrade?canceled=1`,
  });
  if (!session.url) return NextResponse.redirect(`${siteUrl}/app/upgrade?error=billing`, 303);
  return NextResponse.redirect(session.url, 303);
}
