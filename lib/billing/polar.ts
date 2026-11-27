import "server-only";
import { createPolar, type Polar } from "@polar-sh/sdk/2026-10";
import type { BillingInterval } from "./plans";

let client: Polar | null = null;

export function getPolar(): Polar {
  if (client) return client;
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing environment variable POLAR_ACCESS_TOKEN");
  client = createPolar({
    accessToken,
    ...(process.env.POLAR_ENVIRONMENT === "sandbox" ? { environment: "sandbox" as const } : {}),
    // Test-only: points the client at the local stand-in. Never set in production.
    ...(process.env.POLAR_API_BASE ? { baseUrl: process.env.POLAR_API_BASE } : {}),
  });
  return client;
}

export function productId(interval: BillingInterval): string {
  const id = interval === "annual" ? process.env.POLAR_PRODUCT_ANNUAL : process.env.POLAR_PRODUCT_MONTHLY;
  if (!id) throw new Error(`Missing Polar product id for the ${interval} plan`);
  return id;
}

/** Discount id for the first-month offer, or null when the offer is off. */
export function firstMonthDiscountId(): string | null {
  return process.env.POLAR_DISCOUNT_FIRST_MONTH || null;
}

export function intervalForProduct(id: string | null | undefined): BillingInterval | null {
  if (id && id === process.env.POLAR_PRODUCT_ANNUAL) return "annual";
  if (id && id === process.env.POLAR_PRODUCT_MONTHLY) return "monthly";
  return null;
}
