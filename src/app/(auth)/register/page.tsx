"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { enabled, user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const configurationError = "Authentication is not available right now.";

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace("/discover");
  }, [router, user]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("display_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!displayName || !email || !password) {
      setError("Fill in all fields to create the account.");
      return;
    }

    setPending(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName,
        email,
        password,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      needsEmailConfirmation?: boolean;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to create the account.");
      setPending(false);
      return;
    }

    if (payload.needsEmailConfirmation) {
      setError("Account created. Confirm your email before signing in.");
      setPending(false);
      return;
    }

    setPending(false);
    window.location.href = "/discover";
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>B</span>
          <span>BIRVANA</span>
        </div>

        <p className={styles.eyebrow}>Create account</p>
        <h1 className={styles.title}>Start your music space.</h1>
        <p className={styles.subtitle}>
          Join BIRVANA to save music, build playlists, and publish your own releases.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              name="display_name"
              className={styles.input}
              type="text"
              autoComplete="name"
              placeholder="How your profile should appear"
              required
            />
          </label>

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
              autoComplete="new-password"
              placeholder="Create a password"
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
            {pending ? "Creating account..." : enabled ? "Create account" : "Auth unavailable"}
          </button>
        </form>

        <p className={styles.footer}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
