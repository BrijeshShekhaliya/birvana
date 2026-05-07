import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeAuthEntry, normalizeRedirectTarget } from "@/lib/auth/redirects";
import { getPublicSupabaseEnv, hasSupabaseEnv } from "@/lib/env";

type AuthSettings = {
  external?: {
    google?: boolean;
  };
};

function redirectToEntry(request: NextRequest, entry: string, next: string, error: string) {
  const redirectUrl = new URL(entry, request.url);

  if (next !== "/discover") {
    redirectUrl.searchParams.set("next", next);
  }

  redirectUrl.searchParams.set("error", error);
  return NextResponse.redirect(redirectUrl);
}

async function isGoogleEnabled() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const settingsUrl = `${url}/auth/v1/settings`;

  const response = await fetch(settingsUrl, {
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${anonKey!}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as AuthSettings;
  return payload.external?.google === true;
}

export async function GET(request: NextRequest) {
  const next = normalizeRedirectTarget(request.nextUrl.searchParams.get("next"));
  const from = request.nextUrl.searchParams.get("from");
  const entry = normalizeAuthEntry(from);

  if (!hasSupabaseEnv()) {
    return redirectToEntry(request, entry, next, "Authentication is not available right now.");
  }

  const googleEnabled = await isGoogleEnabled();

  if (googleEnabled === false) {
    return redirectToEntry(
      request,
      entry,
      next,
      "Google sign-in is not configured yet. Enable Google in Supabase Auth first.",
    );
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  const supabase = createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", next);
  callbackUrl.searchParams.set("from", from === "register" ? "register" : "login");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        prompt: "select_account",
      },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return redirectToEntry(request, entry, next, error?.message || "Unable to start Google sign-in.");
  }

  return NextResponse.redirect(data.url);
}
