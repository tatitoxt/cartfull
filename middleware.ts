import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_COOKIE = "cf_utm";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn = false;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith("/app") && !signedIn) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  // First-touch attribution: keep the campaign that brought the visitor until they sign up.
  if (!request.cookies.has(UTM_COOKIE)) {
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const value = searchParams.get(k);
      if (value) utm[k] = value.slice(0, 120);
    }
    if (Object.keys(utm).length) {
      response.cookies.set(UTM_COOKIE, JSON.stringify(utm), {
        maxAge: 60 * 60 * 24 * 90,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|api/stripe/webhook|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
