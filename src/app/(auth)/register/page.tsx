"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/components/auth/AuthForm.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandLockup } from "@/components/shared/BrandLockup";

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
      email?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Unable to create the account.");
      setPending(false);
      return;
    }

    if (payload.needsEmailConfirmation) {
      setPending(false);
      const params = new URLSearchParams({
        email: payload.email || email,
        mode: "signup",
      });
      router.push(`/verify-email?${params.toString()}`);
      return;
    }

    setPending(false);
    window.location.href = "/discover";
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.story}>
          <div className={styles.storyHeader}>
            <BrandLockup badge="New account" />
          </div>

          <div className={styles.storyCopyWrap}>
            <p className={styles.storyEyebrow}>Create account</p>
            <h1 className={styles.storyTitle}>Create your account and move straight into the catalog.</h1>
            <p className={styles.storyCopy}>
              Set up the basics once, then use the same account for listening, playlists, and
              studio uploads. Verification emails come from birvana.official.in@gmail.com.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>One account for all flows</p>
              <p className={styles.storyCardBody}>Discovery, playlists, liked songs, uploads, and artist tools all stay under the same identity.</p>
            </article>
            <article className={styles.storyCard}>
              <p className={styles.storyCardTitle}>Professional verification</p>
              <p className={styles.storyCardBody}>A one-time code confirms your email before the account is fully active.</p>
            </article>
          </div>
        </aside>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.mobileOnly}>
              <BrandLockup badge="New account" />
            </div>
            <p className={styles.eyebrow}>Create account</p>
            <h2 className={styles.title}>Create your BIRVANA account.</h2>
            <p className={styles.subtitle}>Add your details once and finish with email verification.</p>
          </div>

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

            {error ? <p className={`${styles.status} ${styles.statusError}`}>{error}</p> : null}
            {!enabled ? <p className={`${styles.status} ${styles.statusError}`}>{configurationError}</p> : null}

            <button className={styles.button} type="submit" disabled={pending || !enabled}>
              {pending ? "Creating account..." : enabled ? "Create account" : "Auth unavailable"}
            </button>
          </form>

          <p className={styles.footer}>
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
