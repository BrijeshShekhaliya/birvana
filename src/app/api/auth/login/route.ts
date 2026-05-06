import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  clearLoginOtpChallenge,
  requireVerifiedLoginOtp,
  writeLoginOtpChallenge,
} from "@/lib/auth/login-otp";
import { getPublicSupabaseEnv, hasSupabaseEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { email, password } = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const { url, anonKey } = getPublicSupabaseEnv();
  const otpGate = requireVerifiedLoginOtp(request, email);

  if (!otpGate.ok) {
    const errorResponse = NextResponse.json({ error: otpGate.error }, { status: otpGate.status });

    if (otpGate.state) {
      writeLoginOtpChallenge(errorResponse, otpGate.state);
    } else {
      clearLoginOtpChallenge(errorResponse);
    }

    return errorResponse;
  }

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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  clearLoginOtpChallenge(response);
  return response;
}
