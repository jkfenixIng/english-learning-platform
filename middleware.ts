import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./lib/i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  // If next-intl wants to redirect (e.g. / -> /es based on accept-language), respect it
  if (intlResponse.status !== 200 && intlResponse.headers.get("location")) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  // Strip locale prefix for route checks (/es/login -> /login, /es -> /)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)(?=\/|$)/, "") || "/";

  const publicPaths = ["/", "/login", "/register", "/api"];
  const isPublic = publicPaths.some(
    (p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`),
  );

  const needsAuth =
    pathnameWithoutLocale.includes("/dashboard") ||
    pathnameWithoutLocale.includes("/levels") ||
    pathnameWithoutLocale.includes("/admin") ||
    pathnameWithoutLocale.includes("/tutor") ||
    pathnameWithoutLocale.includes("/shop") ||
    pathnameWithoutLocale.includes("/settings") ||
    pathnameWithoutLocale.includes("/challenges") ||
    pathnameWithoutLocale.includes("/reviews") ||
    pathnameWithoutLocale.includes("/leaderboard") ||
    pathnameWithoutLocale.includes("/units") ||
    pathnameWithoutLocale.includes("/lessons") ||
    pathnameWithoutLocale.includes("/exercises");

  if (!needsAuth) return intlResponse;

  // Gracefully handle missing env (build without env)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return intlResponse;
  }

  let supabaseResponse = intlResponse;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as never),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    // Preserve locale prefix on redirect (as-needed: /es/* -> /es/login)
    const localePrefix = pathname.match(/^\/(en|es)(?=\/|$)/)?.[0] || "";
    url.pathname = `${localePrefix}/login`;
    // Clean double slash for root
    if (url.pathname === "//login") url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\..*).*)"],
};
