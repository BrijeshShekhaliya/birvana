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
      : "This code is valid for one sign-in attempt. If you did not request it, you can ignore this email.";
  const title = mode === "signup" ? "Verify your email" : "Sign in securely";
  const greeting = displayName?.trim() ? `Hi ${displayName.trim()},` : "Hi,";
  const actionLabel = mode === "signup" ? "Finish setting up your account" : "Continue into BIRVANA";
  const footer =
    mode === "signup"
      ? "Need help? Return to BIRVANA and request a fresh verification code."
      : "Need help? Return to BIRVANA and request a fresh sign-in code.";

  const html = `
    <div style="margin:0;padding:32px 16px;background:#ede6db;font-family:Inter,Arial,sans-serif;color:#171516;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        ${title} - ${otp}
      </div>
      <div style="max-width:640px;margin:0 auto;background:#fffaf2;border:1px solid rgba(23,21,22,0.08);border-radius:30px;overflow:hidden;box-shadow:0 32px 90px rgba(24,19,16,0.12);">
        <div style="padding:32px 32px 18px 32px;background:radial-gradient(circle at top right, rgba(184,98,68,0.18), transparent 32%),linear-gradient(180deg,#fff7ef 0%,#f6ede1 100%);border-bottom:1px solid rgba(23,21,22,0.06);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;">
            <div style="display:inline-flex;align-items:center;gap:12px;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;letter-spacing:0.08em;">
              <span style="width:46px;height:46px;display:inline-grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#b86244,#7d3d2c);color:#fff7ef;font-weight:700;">B</span>
              <span>BIRVANA</span>
            </div>
            <div style="padding:8px 12px;border-radius:999px;background:rgba(23,21,22,0.06);font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6e6762;">Secure access</div>
          </div>
        </div>
        <div style="padding:30px 32px 34px 32px;">
          <p style="margin:0 0 12px 0;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#8a5a48;">One-time code</p>
          <h1 style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;font-size:42px;line-height:1;letter-spacing:-0.06em;color:#171516;">${title}</h1>
          <p style="margin:18px 0 0 0;font-size:16px;line-height:1.7;color:#4f4945;">${greeting}</p>
          <p style="margin:10px 0 0 0;font-size:16px;line-height:1.7;color:#4f4945;">${intro}</p>
          <div style="margin:26px 0 18px 0;padding:24px 22px;border-radius:26px;background:linear-gradient(135deg,rgba(184,98,68,0.14),rgba(255,247,239,0.98));border:1px solid rgba(184,98,68,0.18);text-align:center;">
            <div style="font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#7d3d2c;margin-bottom:10px;">Verification code</div>
            <div style="font-family:'Space Grotesk',Arial,sans-serif;font-size:44px;font-weight:700;letter-spacing:0.34em;color:#171516;">${otp}</div>
          </div>
          <div style="padding:18px 18px 16px 18px;border-radius:22px;background:#f3eadf;border:1px solid rgba(23,21,22,0.06);">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5853;">${detail}</p>
            <p style="margin:12px 0 0 0;font-size:14px;line-height:1.7;color:#5f5853;">Requested for: <strong style="color:#171516;">${email}</strong></p>
          </div>
          <div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(23,21,22,0.08);">
            <p style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;font-size:18px;color:#171516;">${actionLabel}</p>
            <p style="margin:8px 0 0 0;font-size:14px;line-height:1.7;color:#5f5853;">${footer}</p>
          </div>
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
