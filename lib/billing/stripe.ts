import "server-only";
import Stripe from "stripe";
import type { BillingInterval } from "./plans";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing environment variable STRIPE_SECRET_KEY");
  const base = process.env.STRIPE_API_BASE;
  if (base && key.startsWith("sk_test_")) {
    // Test-only: talk to the local stand-in instead of api.stripe.com. Ignored with a live key.
    const url = new URL(base);
    client = new Stripe(key, {
      host: url.hostname,
      port: url.port,
      protocol: url.protocol === "https:" ? "https" : "http",
      maxNetworkRetries: 0,
    });
  } else {
    client = new Stripe(key);
  }
  return client;
}

export function priceId(interval: BillingInterval): string {
  const id = interval === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) throw new Error(`Missing Stripe price id for the ${interval} plan`);
  return id;
}

/** Coupon id for the first-month offer, or null when the offer is off. */
export function firstMonthCouponId(): string | null {
  return process.env.STRIPE_COUPON_FIRST_MONTH || null;
}

export function intervalForPrice(id: string | null | undefined): BillingInterval | null {
  if (id && id === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  if (id && id === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}
