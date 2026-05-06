import "server-only";

import nodemailer from "nodemailer";
import { hasSmtpEnv, requireServerEnv } from "@/lib/env";

type SendOtpEmailInput = {
  email: string;
  otp: string;
  mode: "login" | "signup";
  displayName?: string;
};

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) {
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    auth: {
      user: requireServerEnv("SMTP_USER"),
      pass: requireServerEnv("SMTP_PASS"),
    },
  });

  return cachedTransport;
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

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
  const brandMarkSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" role="img" aria-label="BIRVANA">
      <circle cx="22" cy="22" r="22" fill="#101114" />
      <text x="22" y="28" text-anchor="middle" fill="#fffaf1" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">B</text>
    </svg>
  `;
  const otpCells = splitOtp(otp)
    .map(
      (digit) => `
        <td class="otp-gap" style="padding:0 4px;">
          <div class="otp-cell" style="width:34px;height:44px;line-height:44px;border-radius:12px;background:#f5ede4;border:1px solid #e7d9c8;text-align:center;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#171516;">
            ${escapeXml(digit)}
          </div>
        </td>
      `,
    )
    .join("");

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
            background: #f4efe6;
          }
          .shell {
            padding: 32px 16px;
          }
          .card {
            width: 100%;
            max-width: 640px;
            background: #fffaf1;
            border: 1px solid #e8dfd3;
            border-radius: 30px;
            overflow: hidden;
          }
          .hero {
            background: linear-gradient(135deg, #fffdf8 0%, #f7f1e8 58%, #f0e6da 100%);
          }
          .hero-pad {
            padding: 28px 32px 24px;
          }
          .content-pad {
            padding: 32px;
          }
          .badge {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            background: #f1ebe2;
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #6d6660;
          }
          .eyebrow {
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #7c736b;
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
            background: linear-gradient(135deg, #fffaf4 0%, #f7efe5 100%);
            border: 1px solid #eadfce;
            border-radius: 26px;
          }
          .code-label {
            font-family: Arial, sans-serif;
            font-size: 12px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #6d6660;
          }
          .detail-card {
            background: #f6f0e8;
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
            .otp-gap {
              padding: 0 2px !important;
            }
            .otp-cell {
              width: 29px !important;
              height: 40px !important;
              line-height: 40px !important;
              font-size: 22px !important;
            }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f4efe6;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${title} - ${otp}
        </div>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f4efe6;">
          <tr>
            <td align="center" class="shell" style="padding:32px 16px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="card" style="width:100%;max-width:640px;background:#fffaf1;border:1px solid #e8dfd3;border-radius:30px;overflow:hidden;">
                <tr>
                  <td class="hero hero-pad" style="padding:28px 32px 24px;background:linear-gradient(135deg,#fffdf8 0%,#f7f1e8 58%,#f0e6da 100%);border-bottom:1px solid #eadfce;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="width:44px;">
                          <img
                            src="cid:birvana-mark@birvana"
                            alt="BIRVANA"
                            width="44"
                            height="44"
                            style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;"
                          />
                        </td>
                        <td style="width:12px;"></td>
                        <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#171516;white-space:nowrap;">
                          BIRVANA
                        </td>
                        <td style="width:12px;"></td>
                        <td valign="middle">
                          <div class="badge" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1ebe2;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6d6660;">
                            Secure access
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="content-pad" style="padding:32px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td class="eyebrow" style="padding-bottom:12px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#7c736b;">
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
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="code-card" style="background:linear-gradient(135deg,#fffaf4 0%,#f7efe5 100%);border:1px solid #eadfce;border-radius:26px;">
                            <tr>
                              <td align="center" style="padding:22px 16px 24px;">
                                <div class="code-label" style="padding-bottom:10px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#6d6660;">Verification code</div>
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                                  <tr>
                                    ${otpCells}
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
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="detail-card" style="background:#f6f0e8;border:1px solid #eadfce;border-radius:22px;">
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

  return {
    attachments: [
      {
        cid: "birvana-mark@birvana",
        content: brandMarkSvg,
        contentType: "image/svg+xml",
        filename: "birvana-mark.svg",
      },
    ],
    html,
    text,
  };
}

export async function sendOtpEmail(input: SendOtpEmailInput) {
  if (!hasSmtpEnv()) {
    throw new Error("SMTP credentials are missing. Set SMTP_USER and SMTP_PASS to send OTP emails.");
  }

  const transporter = getTransport();
  const { attachments, html, text } = renderOtpEmail(input);

  await transporter.sendMail({
    attachments,
    from: getFromAddress(),
    to: input.email,
    subject: getSubject(input.mode),
    html,
    text,
  });
}
