import { NextResponse, type NextRequest } from "next/server";
import { captureServer } from "@/lib/analytics/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands every sign-in: the emailed link (token_hash), Google and any other
 * PKCE flow (code).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  let failed = true;
  if (tokenHash) {
    const type = searchParams.get("type") === "magiclink" ? "magiclink" : "email";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }
  if (failed) return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(next)}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && Date.now() - Date.parse(user.created_at) < 10 * 60 * 1000) {
    await captureServer("signup", user.id, { method: user.app_metadata?.provider ?? "email" });
  }
  return NextResponse.redirect(`${origin}${next}`);
}
