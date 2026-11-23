import { NextResponse, type NextRequest } from "next/server";
import { completeLink, noteSignup } from "@/lib/auth/complete-link";
import { normalizeEmail, REQUESTED_COOKIE } from "@/lib/auth/requested";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands every sign-in: the emailed link (token_hash), Google and any other
 * PKCE flow (code).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const failure = NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(next)}`);

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  if (tokenHash) {
    // An unencoded "+" in the address arrives as a space.
    const claimed = normalizeEmail(searchParams.get("email")).replace(/ /g, "+");
    if (!claimed) return failure;
    if (claimed !== normalizeEmail(request.cookies.get(REQUESTED_COOKIE)?.value)) {
      // This browser didn't ask for a link to that address (another device, or a
      // link someone else sent), so the person confirms the account first.
      const confirm = new URL("/auth/confirm", origin);
      confirm.search = new URLSearchParams({
        token_hash: tokenHash,
        type: searchParams.get("type") ?? "email",
        email: claimed,
        next,
      }).toString();
      return NextResponse.redirect(confirm);
    }
    if (!(await completeLink(tokenHash, searchParams.get("type"), claimed))) return failure;
  } else if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure;
    await noteSignup(data.user);
  } else {
    return failure;
  }
  return NextResponse.redirect(`${origin}${next}`);
}
