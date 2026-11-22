import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { replacesStored } from "./plans";
import { intervalForPrice } from "./stripe";

const iso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

/**
 * Mirrors a Stripe subscription into the subscriptions table. This row is the
 * only thing access checks ever read.
 */
export async function syncSubscription(admin: SupabaseClient, subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  let userId = subscription.metadata?.user_id ?? null;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) throw new Error(`Subscription ${subscription.id} is not linked to a user`);

  const { data: stored } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!replacesStored(stored?.stripe_subscription_id, subscription)) return;

  const item = subscription.items.data[0];
  const price = item?.price.id ?? null;
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: price,
      billing_interval: intervalForPrice(price) ?? item?.price.recurring?.interval ?? null,
      trial_end: iso(subscription.trial_end),
      current_period_end: iso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not store subscription: ${error.message}`);
}
