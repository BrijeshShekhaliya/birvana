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

function splitOtp(otp: string) {
  return otp.replace(/\s+/g, "").split("");
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
  const codeLabel = mode === "signup" ? "Verify your email to continue" : "Use this code to sign in now";
  const otpDigits = splitOtp(otp);
  const otpCells = otpDigits
    .map(
      (digit) => `
        <td align="center" valign="middle" width="42" height="52" style="width:42px;height:52px;border-radius:14px;background:#fff7f1;border:1px solid #d99879;font-family:Arial,sans-serif;font-size:28px;line-height:52px;font-weight:700;color:#171516;">
          ${digit}
        </td>
      `,
    )
    .join('<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>${title}</title>
        <style>
          body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          img {
            -ms-interpolation-mode: bicubic;
          }
          table {
            border-collapse: collapse !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #ede6db;
          }
          .shell {
            padding: 32px 16px;
          }
          .card {
            width: 100%;
            max-width: 640px;
            background: #fffaf2;
            border: 1px solid #e5d7c8;
            border-radius: 30px;
            overflow: hidden;
          }
          .hero {
            background: linear-gradient(135deg, #fff7ef 0%, #f4e7d8 58%, #f0ddd0 100%);
          }
          .hero-pad {
            padding: 28px 32px 24px;
          }
          .content-pad {
            padding: 32px;
          }
          .brand {
            font-family: Arial, sans-serif;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #171516;
          }
          .brand-sub {
            font-family: Arial, sans-serif;
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #8a5a48;
          }
          .badge {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            background: #efe4d7;
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #756d67;
          }
          .eyebrow {
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #8a5a48;
          }
          .title {
            font-family: Arial, sans-serif;
            font-size: 44px;
            line-height: 1.02;
            font-weight: 700;
            color: #171516;
          }
          .body-copy {
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.7;
            color: #4f4945;
          }
          .code-card {
            background: linear-gradient(135deg, #fff2e9 0%, #f8ece1 100%);
            border: 1px solid #edd2bd;
            border-radius: 26px;
          }
          .code-label {
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #8a4e3a;
          }
          .code-value {
            font-family: Arial, sans-serif;
            font-size: 28px;
            line-height: 1;
            font-weight: 700;
            color: #171516;
          }
          .detail-card {
            background: #f3eadf;
            border: 1px solid #eadfce;
            border-radius: 22px;
          }
          .divider {
            border-top: 1px solid #eadfce;
          }
          .footer-title {
            font-family: Arial, sans-serif;
            font-size: 18px;
            line-height: 1.4;
            font-weight: 700;
            color: #171516;
          }
          @media screen and (max-width: 600px) {
            .shell {
              padding: 14px 8px !important;
            }
            .hero-pad {
              padding: 20px 18px 18px !important;
            }
            .content-pad {
              padding: 22px 18px 24px !important;
            }
            .title {
              font-size: 34px !important;
              line-height: 1.06 !important;
            }
            .body-copy {
              font-size: 15px !important;
              line-height: 1.7 !important;
            }
            .badge {
              font-size: 11px !important;
              letter-spacing: 0.12em !important;
            }
            .digit {
              width: 34px !important;
              height: 46px !important;
              line-height: 46px !important;
              font-size: 24px !important;
            }
            .mobile-stack,
            .mobile-stack tbody,
            .mobile-stack tr,
            .mobile-stack td {
              display: block !important;
              width: 100% !important;
            }
            .hero-row,
            .hero-row tbody,
            .hero-row tr,
            .hero-row td {
              display: table !important;
              width: auto !important;
            }
            .hero-badge {
              padding-top: 10px !important;
            }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#ede6db;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${title} - ${otp}
        </div>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#ede6db;">
          <tr>
            <td align="center" class="shell" style="padding:32px 16px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="card" style="width:100%;max-width:640px;background:#fffaf2;border:1px solid #e5d7c8;border-radius:30px;overflow:hidden;">
                <tr>
                  <td class="hero hero-pad" style="padding:28px 32px 24px;background:linear-gradient(135deg,#fff7ef 0%,#f4e7d8 58%,#f0ddd0 100%);border-bottom:1px solid #eadfce;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="top">
                          <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="hero-row" style="border-collapse:separate !important;">
                            <tr>
                              <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;border-radius:24px;background:#a75439;background-image:linear-gradient(135deg,#bf6a4b,#8d442f);">
                                <div style="width:48px;height:48px;line-height:48px;font-size:0;">&nbsp;</div>
                              </td>
                              <td width="14" style="width:14px;font-size:0;line-height:0;">&nbsp;</td>
                              <td valign="middle">
                                <div class="brand" style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#171516;">
                                  BIRVANA
                                </div>
                                <div class="brand-sub" style="padding-top:4px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a5a48;">
                                  Music platform
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" valign="middle" class="hero-badge" style="padding-top:14px;">
                          <span class="badge" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#efe4d7;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#756d67;">Secure access</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="content-pad" style="padding:32px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td class="eyebrow" style="padding-bottom:12px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#8a5a48;">
                          One-time code
                        </td>
                      </tr>
                      <tr>
                        <td class="title" style="padding-bottom:18px;font-family:Arial,sans-serif;font-size:44px;line-height:1.02;font-weight:700;color:#171516;">
                          ${title}
                        </td>
                      </tr>
                      <tr>
                        <td class="body-copy" style="padding-bottom:8px;font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#4f4945;">
                          ${greeting}
                        </td>
                      </tr>
                      <tr>
                        <td class="body-copy" style="padding-bottom:22px;font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#4f4945;">
                          ${intro}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:18px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="code-card" style="background:linear-gradient(135deg,#fff2e9 0%,#f8ece1 100%);border:1px solid #edd2bd;border-radius:26px;">
                            <tr>
                              <td align="center" style="padding:22px 16px 24px;">
                                <div class="code-label" style="padding-bottom:10px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#8a4e3a;">Verification code</div>
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                                  <tr>
                                    ${otpCells.replace(/<td align="center"/g, '<td class="digit" align="center"')}
                                  </tr>
                                </table>
                                <div class="body-copy" style="padding-top:10px;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#6b625d;">
                                  ${codeLabel}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:22px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="detail-card" style="background:#f3eadf;border:1px solid #eadfce;border-radius:22px;">
                            <tr>
                              <td style="padding:18px 18px 16px;">
                                <div class="body-copy" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#5f5853;">
                                  ${detail}
                                </div>
                                <div class="body-copy" style="padding-top:12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#5f5853;">
                                  Requested for: <strong style="color:#171516;">${email}</strong>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td class="divider" style="padding-top:20px;border-top:1px solid #eadfce;">
                          <div class="footer-title" style="padding-bottom:8px;font-family:Arial,sans-serif;font-size:18px;line-height:1.4;font-weight:700;color:#171516;">
                            ${actionLabel}
                          </div>
                          <div class="body-copy" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#5f5853;">
                            ${footer}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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
