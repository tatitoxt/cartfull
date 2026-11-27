import { NextResponse, type NextRequest } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { getPolar } from "@/lib/billing/polar";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The subscription an event is about, if any. */
function subscriptionIdOf(payload: { type: string; data: unknown }): string | null {
  if (!payload.type.startsWith("subscription.")) return null;
  const data = payload.data as { id?: string };
  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event;
  try {
    event = await webhooks.validateEvent(await request.text(), headers, secret);
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) {
      // A correctly signed event this SDK version doesn't know: acknowledge it
      // so Polar stops retrying, and upgrade the SDK deliberately later.
      return NextResponse.json({ received: true, unknown: true });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const deliveryId = headers["webhook-id"];
  if (deliveryId) {
    const { data: seen } = await admin.from("billing_events").select("id").eq("id", deliveryId).maybeSingle();
    if (seen) return NextResponse.json({ received: true, duplicate: true });
  }

  const subscriptionId = subscriptionIdOf(event);
  if (subscriptionId) {
    try {
      // Events can arrive out of order, so always store Polar's current state rather
      // than the snapshot inside the event.
      const subscription = await getPolar().subscriptions.get(subscriptionId);
      await syncSubscription(admin, subscription);
    } catch (error) {
      console.error("Polar webhook failed", event.type, error);
      // A 500 makes Polar retry later.
      return NextResponse.json({ error: "Could not process event" }, { status: 500 });
    }
  }

  if (deliveryId) await admin.from("billing_events").upsert({ id: deliveryId, type: event.type });
  return NextResponse.json({ received: true });
}
