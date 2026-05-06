"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandLockup } from "@/components/shared/BrandLockup";

type SignInMethod = "password" | "otp";

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
    setNotice("Your sign-in code has been sent. Enter it below to sign in directly.");
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
            <p className={styles.storyEyebrow}>Sign in</p>
            <h1 className={styles.storyTitle}>Open your music space without friction.</h1>
            <p className={styles.storyCopy}>
              Keep password login for speed, or switch to a one-time email code from
              {" "}birvana.official.in@gmail.com when you want a clean secure sign-in.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>Continue listening</p>
              <p className={styles.storyCardBody}>Return to your queue, liked songs, and latest artist updates in one place.</p>
            </article>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>Two ways to access</p>
              <p className={styles.storyCardBody}>Use your password when you know it, or request an email code when you need a safer quick entry.</p>
            </article>
          </div>
        </aside>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.eyebrow}>Account access</p>
            <h2 className={styles.title}>Welcome back.</h2>
            <p className={styles.subtitle}>Choose the sign-in method that fits this device.</p>
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
            <span className={styles.label}>Email</span>
            <input
              name="email"
              className={styles.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
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
              <p className={styles.helper}>We&apos;ll send a code to your inbox and sign you in as soon as it is verified.</p>

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
                  <label className={styles.field}>
                    <span className={styles.label}>Verification code</span>
                    <input
                      name="token"
                      className={styles.input}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter the code from your email"
                      value={token}
                      onChange={(event) => setToken(event.target.value.replace(/\s+/g, ""))}
                      required
                    />
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
