import type { Metadata } from "next";
import { getEntitlement, requireSession } from "@/lib/app/data";
import { WelcomeStatus } from "./welcome-status";

export const metadata: Metadata = { title: "You're in" };
export const dynamic = "force-dynamic";

/** Stripe sends shoppers here after Checkout. Access is granted by the webhook, not by this page. */
export default async function WelcomePage() {
  const session = await requireSession("/app/welcome");
  const entitlement = await getEntitlement(session);
  return <WelcomeStatus active={entitlement.active} status={entitlement.status} interval={entitlement.interval} />;
}
