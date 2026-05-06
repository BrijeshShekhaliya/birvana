import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Music2, PlaySquare, Users } from "lucide-react";
import styles from "./page.module.css";
import { AppFooter } from "@/components/shared/AppFooter";
import { getCurrentUser } from "@/lib/data";

export default async function LandingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/discover");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.poster}>
          <div className={styles.content}>
            <div>
              <div className={styles.nav}>
                <div className={styles.brand}>
                  <span className={styles.mark}>B</span>
                  <span>BIRVANA</span>
                </div>

                <div className={styles.actions}>
                  <Link className={styles.ghost} href="/login">
                    Login
                  </Link>
                  <Link className={styles.solid} href="/register">
                    Start free
                  </Link>
                </div>
              </div>

              <p className={styles.eyebrow}>Music for listening, collecting, and releasing</p>
              <h1 className={styles.title}>BIRVANA keeps your music close and your studio simple.</h1>
              <p className={styles.subtitle}>
                Start with one account, one player, and one upload flow. Browse the catalog, save
                what matters, and publish your own tracks without switching tools.
              </p>
            </div>

            <div className={styles.actions}>
              <Link className={styles.solid} href="/register">
                Create account
                <ArrowRight size={16} />
              </Link>
              <Link className={styles.ghost} href="/login">
                Open app
              </Link>
            </div>
          </div>

          <div className={styles.previewGrid}>
            <article className={styles.preview}>
              <Music2 size={20} />
              <p className={styles.previewLabel}>Discover</p>
              <p className={styles.previewValue}>A clean feed for tracks, playlists, and artists.</p>
            </article>
            <article className={styles.preview}>
              <PlaySquare size={20} />
              <p className={styles.previewLabel}>Library</p>
              <div className={styles.stack}>
                <div className={styles.row}>
                  <strong>Liked songs</strong>
                  <span>Keep the tracks you return to</span>
                </div>
                <div className={styles.row}>
                  <strong>Saved playlists</strong>
                  <span>Hold onto collections you care about</span>
                </div>
                <div className={styles.row}>
                  <strong>Studio</strong>
                  <span>Upload, review, and organize your own catalog</span>
                </div>
              </div>
            </article>
            <article className={styles.preview}>
              <Users size={20} />
              <p className={styles.previewLabel}>Artists</p>
              <p className={styles.previewValue}>Follow the people behind the music and share playlists cleanly.</p>
            </article>
          </div>
        </div>
        <AppFooter />
      </section>
    </main>
  );
}
