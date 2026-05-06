"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";

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
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>B</span>
          <span>BIRVANA</span>
        </div>

        <p className={styles.eyebrow}>Sign in</p>
        <h1 className={styles.title}>Pick up where you left off.</h1>
        <p className={styles.subtitle}>
          Open your library, continue listening, and manage your studio from one account. Sign in
          with your password or use a one-time code sent from birvana.official.in@gmail.com.
        </p>

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

        <div className={styles.form}>
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

              <p className={styles.helper}>
                Use this if you already know your account password.
              </p>

              <button
                className={styles.button}
                type="submit"
                disabled={pending !== null || !enabled}
              >
                {pending === "password-sign-in" ? "Signing in..." : enabled ? "Sign in with password" : "Auth unavailable"}
              </button>
            </form>
          ) : null}

          {method === "otp" ? (
            <div className={styles.form}>
              <p className={styles.helper}>
                We&apos;ll email a six-digit code and sign you in as soon as it is verified.
              </p>

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
                      placeholder="6-digit code"
                      value={token}
                      onChange={(event) => setToken(event.target.value.replace(/\s+/g, ""))}
                      required
                    />
                  </label>

                  <button
                    className={styles.button}
                    type="button"
                    onClick={verifyCode}
                    disabled={pending !== null || !enabled}
                  >
                    {pending === "verify-code" ? "Verifying..." : "Sign in with email code"}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {error ? <p className={`${styles.status} ${styles.statusError}`}>{error}</p> : null}
          {notice ? <p className={`${styles.status} ${styles.statusSuccess}`}>{notice}</p> : null}
          {!enabled ? <p className={`${styles.status} ${styles.statusError}`}>{configurationError}</p> : null}
        </div>

        <p className={styles.footer}>
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
