import "server-only";

import nodemailer from "nodemailer";
import { hasSmtpEnv, requireServerEnv } from "@/lib/env";

type SendOtpEmailInput = {
  email: string;
  otp: string;
  mode: "login" | "signup";
  displayName?: string;
};

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    auth: {
      user: requireServerEnv("SMTP_USER"),
      pass: requireServerEnv("SMTP_PASS"),
    },
  });
}

function getFromAddress() {
  const email = process.env.SMTP_FROM_EMAIL || "birvana.official.in@gmail.com";
  const name = process.env.SMTP_FROM_NAME || "BIRVANA";
  return `"${name}" <${email}>`;
}

function getSubject(mode: "login" | "signup") {
  return mode === "signup" ? "Verify your BIRVANA account" : "Your BIRVANA sign-in code";
}

function renderOtpEmail({ email, otp, mode, displayName }: SendOtpEmailInput) {
  const intro =
    mode === "signup"
      ? "Use this one-time code to finish creating your BIRVANA account."
      : "Use this one-time code to sign in to your BIRVANA account.";
  const detail =
    mode === "signup"
      ? "Your account will stay pending until this code is confirmed."
      : "This code is valid for one sign-in attempt and expires with Supabase's OTP rules.";
  const title = mode === "signup" ? "Verify your email" : "Sign in securely";
  const greeting = displayName?.trim() ? `Hi ${displayName.trim()},` : "Hi,";

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Inter,Arial,sans-serif;color:#171516;">
      <div style="max-width:620px;margin:0 auto;background:linear-gradient(180deg,#fffaf1 0%,#f7f0e4 100%);border:1px solid rgba(23,21,22,0.08);border-radius:28px;overflow:hidden;box-shadow:0 28px 80px rgba(24,19,16,0.08);">
        <div style="padding:28px 28px 0 28px;">
          <div style="display:inline-flex;align-items:center;gap:12px;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;letter-spacing:0.08em;">
            <span style="width:44px;height:44px;display:inline-grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#b86244,#7d3d2c);color:#fff7ef;font-weight:700;">B</span>
            <span>BIRVANA</span>
          </div>
        </div>
        <div style="padding:24px 28px 32px 28px;">
          <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#6e6762;">One-time code</p>
          <h1 style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;font-size:40px;line-height:0.98;letter-spacing:-0.06em;color:#171516;">${title}</h1>
          <p style="margin:16px 0 0 0;font-size:16px;line-height:1.7;color:#6e6762;">${greeting}</p>
          <p style="margin:10px 0 0 0;font-size:16px;line-height:1.7;color:#6e6762;">${intro}</p>
          <div style="margin:24px 0;padding:22px 20px;border-radius:24px;background:linear-gradient(135deg,rgba(184,98,68,0.12),rgba(255,250,241,0.92));border:1px solid rgba(184,98,68,0.18);text-align:center;">
            <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7d3d2c;margin-bottom:10px;">Verification code</div>
            <div style="font-family:'Space Grotesk',Arial,sans-serif;font-size:42px;font-weight:700;letter-spacing:0.32em;color:#171516;">${otp}</div>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#6e6762;">${detail}</p>
          <p style="margin:18px 0 0 0;font-size:14px;line-height:1.7;color:#6e6762;">Requested for: <strong style="color:#171516;">${email}</strong></p>
        </div>
      </div>
    </div>
  `;

  const text = [
    "BIRVANA",
    "",
    title,
    greeting,
    intro,
    `Verification code: ${otp}`,
    detail,
    `Requested for: ${email}`,
  ].join("\n");

  return { html, text };
}

export async function sendOtpEmail(input: SendOtpEmailInput) {
  if (!hasSmtpEnv()) {
    throw new Error("SMTP credentials are missing. Set SMTP_USER and SMTP_PASS to send OTP emails.");
  }

  const transporter = getTransport();
  const { html, text } = renderOtpEmail(input);

  await transporter.sendMail({
    from: getFromAddress(),
    to: input.email,
    subject: getSubject(input.mode),
    html,
    text,
  });
}
