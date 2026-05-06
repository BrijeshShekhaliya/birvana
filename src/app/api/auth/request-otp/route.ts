import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseEnv, hasSupabaseEnv } from "@/lib/env";

type OtpMode = "login" | "signup";

function normalizeMode(value: string | undefined): OtpMode {
  return value === "signup" ? "signup" : "login";
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { email, mode } = (await request.json().catch(() => ({}))) as {
    email?: string;
    mode?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "Enter your email first." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const normalizedMode = normalizeMode(mode);
  const { error } =
    normalizedMode === "signup"
      ? await supabase.auth.resend({
          type: "signup",
          email,
        })
      : await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
