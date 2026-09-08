import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/lib/i18n/routing";

function sanitizeNext(value: string | null): string {
  if (!value) return "/";
  // Only allow internal paths starting with single /
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // Disallow backslashes and protocol-like patterns
  if (value.includes("\\") || value.includes("://")) return "/";
  return value;
}

function resolveNextWithLocale(sanitizedNext: string, locale: string): string {
  // If already prefixed with a locale, keep as-is
  if (/^\/(en|es)(?=\/|$)/.test(sanitizedNext)) return sanitizedNext;
  // Bare "/" -> locale root (next-intl as-needed will handle default locale)
  if (sanitizedNext === "/") return `/${locale}`;
  // Prefix locale for any other internal path
  return `/${locale}${sanitizedNext}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params;
  const locale = routing.locales.includes(rawLocale as never) ? rawLocale : routing.defaultLocale;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = sanitizeNext(url.searchParams.get("next"));
  const next = resolveNextWithLocale(rawNext, locale);
  const origin = url.origin;

  // Missing code -> redirect to locale login with error
  if (!code) {
    const dest = new URL(`/${locale}/login`, origin);
    dest.searchParams.set("error", "missing_code");
    return NextResponse.redirect(dest);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const dest = new URL(`/${locale}/login`, origin);
    dest.searchParams.set("error", "misconfigured");
    return NextResponse.redirect(dest);
  }

  // Prepare redirect target; cookies will be attached to this response
  const redirectDest = new URL(next, origin);
  const response = NextResponse.redirect(redirectDest);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options: Record<string, unknown>;
          }) => {
            // Update request cookies for subsequent reads in same request
            request.cookies.set(name, value);
            // Attach to redirect response
            response.cookies.set(name, value, options as never);
          },
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const dest = new URL(`/${locale}/login`, origin);
    dest.searchParams.set("error", "auth_code_error");
    dest.searchParams.set("error_description", error.message);
    const errorResponse = NextResponse.redirect(dest);
    // Preserve PKCE verifier cleanup cookies on error path too
    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie.name, cookie.value, cookie as never);
    });
    return errorResponse;
  }

  return response;
}
