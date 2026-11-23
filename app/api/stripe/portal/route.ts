import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login?next=/app/account`, 303);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!subscription?.stripe_customer_id) return NextResponse.redirect(`${siteUrl}/app/upgrade`, 303);

  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${siteUrl}/app/account`,
  });
  return NextResponse.redirect(session.url, 303);
}
