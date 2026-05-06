"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [error, setError] = useState("");
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

    setPending(true);
    setError("");

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
      setPending(false);
      return;
    }

    setPending(false);
    window.location.href = getSafeRedirectTarget();
  };

  const requestCode = async () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }

    setOtpPending(true);
    setError("");

    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        mode: "login",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to send the sign-in code.");
      setOtpPending(false);
      return;
    }

    setOtpPending(false);
    const params = new URLSearchParams({
      email,
      mode: "login",
      next: getSafeRedirectTarget(),
    });
    router.push(`/verify-email?${params.toString()}`);
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
          Open your library, continue listening, and manage your studio from one account in the
          same dark or light theme you already chose. OTP emails are sent from
          {" "}birvana.official.in@gmail.com.
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
              onChange={(event) => setEmail(event.target.value.trim())}
              required
            />
          </label>

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

          {error ? <p className={styles.error}>{error}</p> : null}
          {!enabled ? <p className={styles.error}>{configurationError}</p> : null}

          <button
            className={styles.button}
            type="submit"
            disabled={pending || !enabled}
          >
            {pending ? "Signing in..." : enabled ? "Sign in" : "Auth unavailable"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          className={styles.secondaryButton}
          type="button"
          onClick={requestCode}
          disabled={otpPending || pending || !enabled}
        >
          {otpPending ? "Sending code..." : "Email me a sign-in code"}
        </button>

        <p className={styles.footer}>
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
