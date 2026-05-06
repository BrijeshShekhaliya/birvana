import { NextResponse, type NextRequest } from "next/server";
import {
  clearLoginOtpChallenge,
  verifyLoginOtpChallenge,
  writeLoginOtpChallenge,
} from "@/lib/auth/login-otp";
import { hasSupabaseEnv, hasSmtpEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv() || !hasSmtpEnv()) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { email, token } = (await request.json().catch(() => ({}))) as {
    email?: string;
    token?: string;
  };

  if (!email || !token) {
    return NextResponse.json({ error: "Enter your email and the verification code." }, { status: 400 });
  }

  const result = verifyLoginOtpChallenge(request, email, token);
  if (!result.ok) {
    const response = NextResponse.json({ error: result.error }, { status: result.status });

    if (result.state) {
      writeLoginOtpChallenge(response, result.state);
    } else {
      clearLoginOtpChallenge(response);
    }

    return response;
  }

  const response = NextResponse.json({ ok: true });
  writeLoginOtpChallenge(response, result.state);
  return response;
}
