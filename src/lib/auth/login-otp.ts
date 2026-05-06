import "server-only";

import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { requireServerEnv } from "@/lib/env";

const COOKIE_NAME = "birvana-login-otp";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type LoginOtpChallenge = {
  attempts: number;
  challengeId: string;
  email: string;
  expiresAt: number;
  otpHash: string;
  verifiedAt: number | null;
};

type LoginOtpResult =
  | {
      ok: true;
      state: LoginOtpChallenge;
    }
  | {
      error: string;
      ok: false;
      state: LoginOtpChallenge | null;
      status: number;
    };

function getOtpSecret() {
  return process.env.AUTH_OTP_SECRET || requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function signValue(value: string) {
  return crypto.createHmac("sha256", getOtpSecret()).update(value).digest("base64url");
}

function encodeState(state: LoginOtpChallenge) {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const signature = signValue(payload);
  return `${payload}.${signature}`;
}

function decodeState(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  if (signValue(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LoginOtpChallenge;
  } catch {
    return null;
  }
}

function hashOtp(state: Pick<LoginOtpChallenge, "challengeId" | "email" | "expiresAt">, otp: string) {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${state.challengeId}:${state.email}:${state.expiresAt}:${otp}`)
    .digest("hex");
}

function matchesOtp(expectedHash: string, actualOtp: string, state: LoginOtpChallenge) {
  const actualHash = hashOtp(state, actualOtp);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function getCookieOptions(expiresAt: number) {
  return {
    expires: new Date(expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function isExpired(state: LoginOtpChallenge) {
  return state.expiresAt <= Date.now();
}

export function createLoginOtpCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createLoginOtpChallenge(email: string, otp: string): LoginOtpChallenge {
  const normalizedEmail = normalizeEmail(email);
  const challengeId = crypto.randomUUID();
  const expiresAt = Date.now() + OTP_TTL_MS;

  return {
    attempts: 0,
    challengeId,
    email: normalizedEmail,
    expiresAt,
    otpHash: hashOtp(
      {
        challengeId,
        email: normalizedEmail,
        expiresAt,
      },
      otp,
    ),
    verifiedAt: null,
  };
}

export function readLoginOtpChallenge(request: NextRequest) {
  return decodeState(request.cookies.get(COOKIE_NAME)?.value);
}

export function writeLoginOtpChallenge(response: NextResponse, state: LoginOtpChallenge) {
  response.cookies.set(COOKIE_NAME, encodeState(state), getCookieOptions(state.expiresAt));
}

export function clearLoginOtpChallenge(response: NextResponse) {
  response.cookies.delete(COOKIE_NAME);
}

export function verifyLoginOtpChallenge(request: NextRequest, email: string, otp: string): LoginOtpResult {
  const state = readLoginOtpChallenge(request);
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = otp.trim();

  if (!state || state.email !== normalizedEmail) {
    return {
      error: "Request a fresh sign-in code first.",
      ok: false,
      state: null,
      status: 400,
    };
  }

  if (isExpired(state)) {
    return {
      error: "That code expired. Request a new one.",
      ok: false,
      state: null,
      status: 400,
    };
  }

  if (state.attempts >= MAX_ATTEMPTS) {
    return {
      error: "Too many incorrect attempts. Request a new code.",
      ok: false,
      state: null,
      status: 429,
    };
  }

  if (!matchesOtp(state.otpHash, normalizedOtp, state)) {
    const nextAttempts = state.attempts + 1;
    const nextState =
      nextAttempts >= MAX_ATTEMPTS
        ? null
        : {
            ...state,
            attempts: nextAttempts,
          };

    return {
      error:
        nextAttempts >= MAX_ATTEMPTS
          ? "Too many incorrect attempts. Request a new code."
          : "That code is incorrect.",
      ok: false,
      state: nextState,
      status: nextAttempts >= MAX_ATTEMPTS ? 429 : 400,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      attempts: 0,
      verifiedAt: Date.now(),
    },
  };
}

export function requireVerifiedLoginOtp(request: NextRequest, email: string): LoginOtpResult {
  const state = readLoginOtpChallenge(request);
  const normalizedEmail = normalizeEmail(email);

  if (!state || state.email !== normalizedEmail) {
    return {
      error: "Verify the sign-in code sent to your email first.",
      ok: false,
      state: null,
      status: 403,
    };
  }

  if (isExpired(state)) {
    return {
      error: "Your sign-in code expired. Request a new one.",
      ok: false,
      state: null,
      status: 403,
    };
  }

  if (!state.verifiedAt) {
    return {
      error: "Verify the sign-in code sent to your email first.",
      ok: false,
      state,
      status: 403,
    };
  }

  return {
    ok: true,
    state,
  };
}
