import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The subscription an event is about, if any. */
function subscriptionIdOf(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>;
  const pick = (value: unknown) =>
    typeof value === "string" ? value : value && typeof value === "object" ? ((value as { id?: string }).id ?? null) : null;
  if (event.type.startsWith("customer.subscription.")) return pick(object.id);
  if (event.type === "checkout.session.completed") return pick(object.subscription);
  if (event.type.startsWith("invoice.")) {
    const parent = object.parent as { subscription_details?: { subscription?: unknown } } | undefined;
    return pick(parent?.subscription_details?.subscription) ?? pick(object.subscription);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  const subscriptionId = subscriptionIdOf(event);
  if (subscriptionId) {
    try {
      // Events can arrive out of order, so always store Stripe's current state rather
      // than the snapshot inside the event.
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(admin, subscription);
    } catch (error) {
      console.error("Stripe webhook failed", event.type, error);
      // A 500 makes Stripe retry later.
      return NextResponse.json({ error: "Could not process event" }, { status: 500 });
    }
  }

  await admin.from("stripe_events").upsert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
