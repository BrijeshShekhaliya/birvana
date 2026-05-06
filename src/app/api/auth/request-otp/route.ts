import { after, NextResponse, type NextRequest } from "next/server";
import { sendOtpEmail } from "@/lib/email";
import { getAdminSupabase } from "@/lib/supabase/server";
import { hasSupabaseEnv, hasSmtpEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv() || !hasSmtpEnv()) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const { email } = (await request.json().catch(() => ({}))) as {
    email?: string;
  };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Enter your email first." }, { status: 400 });
  }

  const adminSupabase = await getAdminSupabase();
  if (!adminSupabase) {
    return NextResponse.json({ error: "Authentication is not available right now." }, { status: 500 });
  }

  const profileLookup = await adminSupabase
    .from("profiles")
    .select("display_name,email")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (profileLookup.error) {
    return NextResponse.json({ error: profileLookup.error.message }, { status: 400 });
  }

  const profile = profileLookup.data;

  if (!profile?.email) {
    return NextResponse.json({ error: "No account was found for that email address." }, { status: 404 });
  }

  const generated = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
  });

  if (generated.error || !generated.data?.properties.email_otp) {
    return NextResponse.json(
      { error: generated.error?.message || "Unable to generate the sign-in code." },
      { status: 400 },
    );
  }

  after(async () => {
    try {
      await sendOtpEmail({
        email: normalizedEmail,
        otp: generated.data.properties.email_otp,
        mode: "login",
        displayName: profile.display_name ?? undefined,
      });
    } catch (sendError) {
      console.error("Unable to send login OTP email", sendError);
    }
  });

  return NextResponse.json({ ok: true });
}
