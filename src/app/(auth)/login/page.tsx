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
  const [pending, setPending] = useState(false);
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
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

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
          Open your library, continue listening, and manage your studio from one account.
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

        <Link className={styles.secondaryButton} href="/admin">
          Open admin panel
        </Link>

        <p className={styles.footer}>
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
