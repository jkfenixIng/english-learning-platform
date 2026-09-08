import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./lib/i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // Allow public routes
  const publicPaths = ["/", "/login", "/register", "/api"];
  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname === "/en" || pathname === "/es",
  );

  // Supabase auth check for /app and /admin
  const needsAuth = pathname.includes("/dashboard") || pathname.includes("/levels") || pathname.includes("/admin") || pathname.includes("/tutor") || pathname.includes("/shop") || pathname.includes("/settings");

  if (!needsAuth) return intlResponse;

  let supabaseResponse = intlResponse;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
