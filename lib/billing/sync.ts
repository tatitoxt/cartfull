import "server-only";
import type { models } from "@polar-sh/sdk/2026-10";
import type { SupabaseClient } from "@supabase/supabase-js";
import { replacesStored } from "./plans";
import { intervalForProduct } from "./polar";

const INTERVALS: Record<string, string> = { month: "monthly", year: "annual" };

/**
 * Mirrors a Polar subscription into the subscriptions table. This row is the
 * only thing access checks ever read.
 */
export async function syncSubscription(admin: SupabaseClient, subscription: models.Subscription): Promise<void> {
  const customerId = subscription.customer_id;

  let userId = (subscription.metadata?.user_id as string | undefined) ?? subscription.customer?.external_id ?? null;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("billing_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) throw new Error(`Subscription ${subscription.id} is not linked to a user`);

  const { data: stored } = await admin
    .from("subscriptions")
    .select("billing_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!replacesStored(stored?.billing_subscription_id, subscription)) return;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      billing_customer_id: customerId,
      billing_subscription_id: subscription.id,
      status: subscription.status,
      price_id: subscription.product_id,
      billing_interval: intervalForProduct(subscription.product_id) ?? INTERVALS[subscription.recurring_interval] ?? null,
      trial_end: subscription.trial_end,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not store subscription: ${error.message}`);
}
