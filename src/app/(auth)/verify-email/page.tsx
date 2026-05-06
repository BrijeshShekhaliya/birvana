"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";

type VerificationMode = "login" | "signup";

function getVerificationMode(value: string | null): VerificationMode {
  return value === "signup" ? "signup" : "login";
}

function getSafeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/discover";
  }

  return value;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enabled, user } = useAuth();
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<"verify" | "resend" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const configurationError = "Authentication is not available right now.";
  const mode = useMemo(
    () => getVerificationMode(searchParams.get("mode")),
    [searchParams],
  );
  const redirectTarget = useMemo(
    () => getSafeRedirectTarget(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(redirectTarget);
  }, [redirectTarget, router, user]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !token) {
      setError("Enter your email and the verification code.");
      return;
    }

    setPending("verify");
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        token,
        mode,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to verify the code.");
      setPending(null);
      return;
    }

    setPending(null);
    window.location.href = redirectTarget;
  };

  const resendCode = async () => {
    if (mode === "signup") {
      setNotice("Go back to sign up if you need a fresh signup code.");
      setError("");
      return;
    }

    if (!email) {
      setError("Enter your email first.");
      return;
    }

    setPending("resend");
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        mode,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to resend the code.");
      setPending(null);
      return;
    }

    setNotice("A fresh verification code has been sent to your email.");
    setPending(null);
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>B</span>
          <span>BIRVANA</span>
        </div>

        <p className={styles.eyebrow}>Verify email</p>
        <h1 className={styles.title}>Enter the code from your inbox.</h1>
        <p className={styles.subtitle}>
          {mode === "signup"
            ? "Finish account setup with the one-time verification code sent from birvana.official.in@gmail.com."
            : "Use the one-time sign-in code from birvana.official.in@gmail.com to open your account securely."}
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              name="email"
              className={styles.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Verification code</span>
            <input
              name="token"
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={token}
              onChange={(event) => setToken(event.target.value.replace(/\s+/g, ""))}
              required
            />
          </label>

          {error ? <p className={`${styles.status} ${styles.statusError}`}>{error}</p> : null}
          {notice ? <p className={`${styles.status} ${styles.statusSuccess}`}>{notice}</p> : null}
          {!enabled ? <p className={`${styles.status} ${styles.statusError}`}>{configurationError}</p> : null}

          <button className={styles.button} type="submit" disabled={pending !== null || !enabled}>
            {pending === "verify" ? "Verifying..." : enabled ? "Verify code" : "Auth unavailable"}
          </button>
        </form>

        <div className={styles.buttonRow}>
          {mode === "login" ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={resendCode}
              disabled={pending !== null || !enabled}
            >
              {pending === "resend" ? "Sending..." : "Resend code"}
            </button>
          ) : (
            <Link className={styles.secondaryButton} href="/register">
              Go back to sign up
            </Link>
          )}
        </div>

        <p className={styles.footer}>
          Need a different address?{" "}
          <Link href={mode === "signup" ? "/register" : "/login"}>
            {mode === "signup" ? "Go back to sign up" : "Go back to sign in"}
          </Link>
        </p>
      </section>
    </main>
  );
}
