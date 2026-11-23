import "server-only";
import type { User } from "@supabase/supabase-js";
import { captureServer } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "./requested";

export async function noteSignup(user: User | null) {
  if (user && Date.now() - Date.parse(user.created_at) < 10 * 60 * 1000) {
    await captureServer("signup", user.id, { method: user.app_metadata?.provider ?? "email" });
  }
}

/**
 * Signs in with an emailed link, but only into the account the person was told
 * about. A link is a bearer token: anyone can forward theirs, so the address it
 * claims is checked against the account it really opens.
 */
export async function completeLink(tokenHash: string, type: string | null | undefined, claimedEmail: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type === "magiclink" ? "magiclink" : "email",
  });
  if (error) return false;
  if (!claimedEmail || normalizeEmail(data.user?.email) !== claimedEmail) {
    await supabase.auth.signOut({ scope: "local" });
    return false;
  }
  await noteSignup(data.user);
  return true;
}
