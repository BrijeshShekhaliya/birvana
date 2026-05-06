"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandLockup } from "@/components/shared/BrandLockup";

type SignInMethod = "password" | "otp";
const OTP_SLOT_COUNT = 8;

function getSafeRedirectTarget() {
  if (typeof window === "undefined") {
    return "/discover";
  }

  const target = new URLSearchParams(window.location.search).get("next");

  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/discover";
  }

  return target;
}

export default function LoginPage() {
  const router = useRouter();
  const { enabled, user } = useAuth();
  const [method, setMethod] = useState<SignInMethod>("password");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"send-code" | "verify-code" | "password-sign-in" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const configurationError = "Authentication is not available right now.";
  const emailLocked = method === "otp" && otpRequested;
  const normalizedToken = token.replace(/\D/g, "").slice(0, OTP_SLOT_COUNT);
  const otpSlots = Array.from({ length: OTP_SLOT_COUNT }, (_, index) => normalizedToken[index] ?? "");

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(getSafeRedirectTarget());
  }, [router, user]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setPending("password-sign-in");
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to sign in.");
      setPending(null);
      return;
    }

    setPending(null);
    window.location.href = getSafeRedirectTarget();
  };

  const requestCode = async () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }

    setPending("send-code");
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/request-login-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to send the sign-in code.");
      setPending(null);
      return;
    }

    setPending(null);
    setOtpRequested(true);
    setToken("");
    setNotice("Your sign-in code is on the way. The email is locked below so the verification step stays on the same address.");
  };

  const verifyCode = async () => {
    if (!email || !token) {
      setError("Enter your email and the verification code.");
      return;
    }

    setPending("verify-code");
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/verify-login-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        token,
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
    window.location.href = getSafeRedirectTarget();
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.story}>
          <div className={styles.storyHeader}>
            <BrandLockup badge="Secure access" />
          </div>

          <div className={styles.storyCopyWrap}>
            <p className={styles.storyEyebrow}>Welcome back</p>
            <h1 className={styles.storyTitle}>Sign in with your password or a one-time email code.</h1>
            <p className={styles.storyCopy}>
              Password stays available for regular sign-in, and the email code path gives you a quick
              fallback from birvana.official.in@gmail.com.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>Continue listening</p>
              <p className={styles.storyCardBody}>Return to your queue, liked songs, and latest artist updates in one place.</p>
            </article>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>Two ways to access</p>
              <p className={styles.storyCardBody}>Use your password when you know it, or request an email code when you need a cleaner mobile-friendly sign-in.</p>
            </article>
          </div>
        </aside>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.mobileOnly}>
              <BrandLockup badge="Secure access" />
            </div>
            <p className={styles.eyebrow}>Account access</p>
            <h2 className={styles.title}>Sign in to BIRVANA.</h2>
            <p className={styles.subtitle}>Choose password or email OTP. The code flow locks the address after send so verification stays on one inbox.</p>
          </div>

          <div className={styles.methodSwitcher} role="tablist" aria-label="Sign-in method">
            <button
              className={`${styles.methodButton} ${method === "password" ? styles.methodButtonActive : ""}`}
              type="button"
              onClick={() => {
                setMethod("password");
                setError("");
                setNotice("");
              }}
            >
              Password
            </button>
            <button
              className={`${styles.methodButton} ${method === "otp" ? styles.methodButtonActive : ""}`}
              type="button"
              onClick={() => {
                setMethod("otp");
                setError("");
                setNotice("");
              }}
            >
              Email OTP
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldHeader}>
              <span className={styles.label}>Email</span>
              {emailLocked ? (
                <button
                  type="button"
                  className={styles.fieldAction}
                  onClick={() => {
                    setOtpRequested(false);
                    setToken("");
                    setNotice("");
                    setError("");
                  }}
                >
                  Change email
                </button>
              ) : null}
            </span>
            <input
              name="email"
              className={styles.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              disabled={emailLocked}
              onChange={(event) => {
                setEmail(event.target.value.trim());
                setOtpRequested(false);
                setToken("");
                setError("");
                setNotice("");
              }}
              required
            />
          </label>

          {method === "password" ? (
            <form className={styles.form} onSubmit={onSubmit}>
              <label className={styles.field}>
                <span className={styles.label}>Password</span>
                <input
                  name="password"
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>

              <p className={styles.helper}>Use password sign-in on devices you trust.</p>

              <button className={styles.button} type="submit" disabled={pending !== null || !enabled}>
                {pending === "password-sign-in" ? "Signing in..." : enabled ? "Sign in with password" : "Auth unavailable"}
              </button>
            </form>
          ) : (
            <div className={styles.form}>
              <p className={styles.helper}>We&apos;ll send a code to your inbox, lock this email for the verification step, and sign you in after the code is confirmed.</p>

              <div className={styles.buttonRow}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={requestCode}
                  disabled={pending !== null || !enabled}
                >
                  {pending === "send-code" ? "Sending code..." : otpRequested ? "Send a fresh code" : "Email me a sign-in code"}
                </button>
              </div>

              {otpRequested ? (
                <>
                  <label className={`${styles.field} ${styles.otpGroup}`}>
                    <span className={styles.label}>Verification code</span>
                    <div className={styles.otpEntry}>
                      <input
                        name="token"
                        className={styles.otpInput}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6,8}"
                        maxLength={OTP_SLOT_COUNT}
                        placeholder="Enter the code from your email"
                        value={normalizedToken}
                        onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, OTP_SLOT_COUNT))}
                        required
                      />
                      <div className={styles.otpSlots} aria-hidden="true">
                        {otpSlots.map((digit, index) => {
                          const isCurrent = index === Math.min(normalizedToken.length, OTP_SLOT_COUNT - 1) && normalizedToken.length < OTP_SLOT_COUNT;
                          return (
                            <span
                              key={`otp-slot-${index}`}
                              className={`${styles.otpSlot} ${digit ? styles.otpSlotFilled : ""} ${isCurrent && !digit ? styles.otpSlotCurrent : ""}`}
                            >
                              {digit}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <p className={styles.otpHint}>Paste the code from the email or type it once. The slots fill automatically.</p>
                  </label>

                  <button className={styles.button} type="button" onClick={verifyCode} disabled={pending !== null || !enabled}>
                    {pending === "verify-code" ? "Verifying..." : "Sign in with email code"}
                  </button>
                </>
              ) : null}
            </div>
          )}

          {error ? <p className={`${styles.status} ${styles.statusError}`}>{error}</p> : null}
          {notice ? <p className={`${styles.status} ${styles.statusSuccess}`}>{notice}</p> : null}
          {!enabled ? <p className={`${styles.status} ${styles.statusError}`}>{configurationError}</p> : null}

          <p className={styles.footer}>
            No account yet? <Link href="/register">Create one</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
