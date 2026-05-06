import { NextResponse, type NextRequest } from "next/server";
import { sendOtpEmail } from "@/lib/email";
import { hasSupabaseEnv, hasSmtpEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv() || !hasSmtpEnv()) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { displayName, email, password } = (await request.json().catch(() => ({}))) as {
    displayName?: string;
    email?: string;
    password?: string;
  };

  if (!displayName || !email || !password) {
    return NextResponse.json({ error: "Fill in all fields to create the account." }, { status: 400 });
  }

  const adminSupabase = await getAdminSupabase();
  if (!adminSupabase) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const emailOtp = data?.properties.email_otp;
  if (!emailOtp) {
    return NextResponse.json({ error: "Unable to generate the verification code." }, { status: 400 });
  }

  try {
    await sendOtpEmail({
      email,
      otp: emailOtp,
      mode: "signup",
      displayName,
    });
  } catch (sendError) {
    return NextResponse.json(
      {
        error:
          sendError instanceof Error
            ? sendError.message
            : "Unable to send the verification email right now.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: true,
    email: data.user?.email ?? email,
  });
}
