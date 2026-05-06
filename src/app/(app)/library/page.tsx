import Link from "next/link";
import { Clock3 } from "lucide-react";
import styles from "./page.module.css";
import { LibraryCollectionsPanel } from "@/components/library/LibraryCollectionsPanel";
import { getCurrentUser, getLibraryData } from "@/lib/data";

export default async function LibraryPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { ownedPlaylists, savedPlaylists } = await getLibraryData(user.id);
  const totalCollections = ownedPlaylists.length + savedPlaylists.length;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Library</p>
          <h1 className={styles.heroTitle}>Your listening home base.</h1>
          <p className={styles.heroText}>
            Keep the playlists you build and the collections you save in one place with a cleaner,
            toggle-based library that feels closer to a real music app.
          </p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Managed</span>
            <strong className={styles.statValue}>{ownedPlaylists.length}</strong>
            <span className={styles.statMeta}>playlists you control</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Saved</span>
            <strong className={styles.statValue}>{savedPlaylists.length}</strong>
            <span className={styles.statMeta}>collections you follow</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>In library</span>
            <strong className={styles.statValue}>{totalCollections}</strong>
            <span className={styles.statMeta}>playlists across both sections</span>
          </div>
        </div>
      </section>

      <section className={styles.historyEntry} aria-label="Playback history">
        <div>
          <p className={styles.historyEyebrow}>Continue listening</p>
          <h2>Recently played songs</h2>
          <p>Open your last 10 songs and resume from the latest saved position on this device.</p>
        </div>
        <Link href="/history" className={styles.historyLink}>
          <Clock3 size={18} strokeWidth={2} />
          View history
        </Link>
      </section>

      <LibraryCollectionsPanel
        ownedPlaylists={ownedPlaylists}
        savedPlaylists={savedPlaylists}
        currentUserId={user.id}
      />
    </div>
  );
}
