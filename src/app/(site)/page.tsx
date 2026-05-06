import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Headphones, Library, UploadCloud } from "lucide-react";
import styles from "./page.module.css";
import { AppFooter } from "@/components/shared/AppFooter";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { getCurrentUser } from "@/lib/data";

export default async function LandingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/discover");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <section className={styles.hero}>
          <header className={styles.header}>
            <BrandLockup badge="Listen • Collect • Release" href="/" />

            <div className={styles.actions}>
              <Link className={styles.ghost} href="/login">
                Login
              </Link>
              <Link className={styles.solid} href="/register">
                Start free
              </Link>
            </div>
          </header>

          <div className={styles.heroGrid}>
            <div className={styles.lead}>
              <p className={styles.eyebrow}>Music for listening, collecting, and releasing</p>
              <h1 className={styles.title}>One place for listeners, playlists, and your studio flow.</h1>
              <p className={styles.subtitle}>
                BIRVANA keeps discovery, saved music, artist pages, and uploads under one calm
                interface so you spend less time switching tools and more time staying with the
                music.
              </p>

              <div className={styles.heroActions}>
                <Link className={styles.solid} href="/register">
                  Create account
                  <ArrowRight size={16} />
                </Link>
                <Link className={styles.ghost} href="/login">
                  Open app
                </Link>
              </div>

              <div className={styles.featureGrid}>
                <article className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <Headphones size={18} />
                  </div>
                  <p className={styles.featureTitle}>Discover that stays readable</p>
                  <p className={styles.featureBody}>Browse tracks and artists without noisy colors or overloaded cards.</p>
                </article>
                <article className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <Library size={18} />
                  </div>
                  <p className={styles.featureTitle}>Keep what matters</p>
                  <p className={styles.featureBody}>Liked songs, library collections, and playback history stay close and easy to revisit.</p>
                </article>
                <article className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <UploadCloud size={18} />
                  </div>
                  <p className={styles.featureTitle}>Release from the same account</p>
                  <p className={styles.featureBody}>Move from listening into uploads and studio tools without leaving the platform.</p>
                </article>
              </div>
            </div>

            <div className={styles.metaRow}>
              <article className={styles.metaCard}>
                <p className={styles.metaLabel}>Playback</p>
                <p className={styles.metaValue}>A single player follows your session instead of scattering controls across pages.</p>
              </article>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Tonight&apos;s queue</h2>
                  <span className={styles.panelHint}>Sample surface</span>
                </div>

                <div className={styles.queue}>
                  <article className={styles.queueRow}>
                    <span className={styles.queueIndex}>1</span>
                    <div>
                      <p className={styles.queueTitle}>Neon Shoreline</p>
                      <p className={styles.queueMeta}>Editorial mix • Warm start</p>
                    </div>
                    <p className={styles.queueDuration}>3:24</p>
                  </article>
                  <article className={styles.queueRow}>
                    <span className={styles.queueIndex}>2</span>
                    <div>
                      <p className={styles.queueTitle}>Late Arrival</p>
                      <p className={styles.queueMeta}>Saved from discover</p>
                    </div>
                    <p className={styles.queueDuration}>4:08</p>
                  </article>
                  <article className={styles.queueRow}>
                    <span className={styles.queueIndex}>3</span>
                    <div>
                      <p className={styles.queueTitle}>Open Studio Draft</p>
                      <p className={styles.queueMeta}>Private upload preview</p>
                    </div>
                    <p className={styles.queueDuration}>2:51</p>
                  </article>
                </div>
              </section>

              <article className={styles.metaCard}>
                <p className={styles.metaLabel}>Artists</p>
                <p className={styles.metaValue}>Follow artist pages, build playlists, and move back into discovery without losing context.</p>
              </article>
            </div>
          </div>
        </section>
        <AppFooter />
      </section>
    </main>
  );
}
