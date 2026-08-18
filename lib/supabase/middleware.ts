import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() makes a network call to verify the token with Supabase Auth.
  // If it fails (network issue), fall back to getSession() which reads cookies locally.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network error — fall back to session from cookies
    const { data } = await supabase.auth.getSession();
    user = data.session?.user ?? null;
  }

  // If getUser returned null but we have a session cookie, use that
  if (!user) {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user ?? null;
  }

  return { user, supabaseResponse, supabase };
}
