import { getEntitlement, getProfile, requireSession } from "@/lib/app/data";
import { MESSAGES } from "@/lib/i18n/messages";
import { WelcomeStatus } from "./welcome-status";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const session = await requireSession("/app/welcome");
  const profile = await getProfile(session);
  return { title: MESSAGES[profile.lang].metadata.welcome };
}

/** Stripe sends shoppers here after Checkout. Access is granted by the webhook, not by this page. */
export default async function WelcomePage() {
  const session = await requireSession("/app/welcome");
  const [entitlement, profile] = await Promise.all([getEntitlement(session), getProfile(session)]);
  return <WelcomeStatus active={entitlement.active} status={entitlement.status} interval={entitlement.interval} lang={profile.lang} />;
}
