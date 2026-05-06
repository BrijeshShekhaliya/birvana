import styles from "./page.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrackCard } from "@/components/shared/TrackCard";
import { compactNumber } from "@/lib/format";
import { getCurrentUser, getLikedTracks } from "@/lib/data";

function formatRuntime(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "0m";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default async function LikedPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const tracks = await getLikedTracks(user.id);
  const uniqueArtists = new Set(tracks.map((track) => track.artist_display)).size;
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration_seconds ?? 0), 0);
  const totalPlays = tracks.reduce((sum, track) => sum + track.play_count, 0);

  return (
    <div className={styles.page}>
      {tracks.length ? (
        <>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>Liked songs</p>
              <h1 className={styles.heroTitle}>Your repeat rotation.</h1>
              <p className={styles.heroText}>
                Keep your favorites in one fast-scanning stack with the tracks you keep coming back to,
                plus a tighter desktop view that stays easy to browse on mobile.
              </p>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Saved tracks</span>
                <strong className={styles.statValue}>{tracks.length}</strong>
                <span className={styles.statMeta}>ready to play instantly</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Artists</span>
                <strong className={styles.statValue}>{uniqueArtists}</strong>
                <span className={styles.statMeta}>across your current mix</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Runtime</span>
                <strong className={styles.statValue}>{formatRuntime(totalDuration)}</strong>
                <span className={styles.statMeta}>kept close in one stack</span>
              </div>
            </div>
          </section>

          <section className={styles.tracksSection}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Your shortlist</p>
                <h2 className={styles.sectionTitle}>Tracks you keep close</h2>
              </div>
              <p className={styles.sectionMeta}>{compactNumber(totalPlays)} combined plays</p>
            </div>

            <div className={styles.list}>
              {tracks.map((track, index) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  tracks={tracks}
                  index={index}
                  variant="liked"
                  queueKey="liked"
                  initialLiked
                  showLikeButton
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="Nothing liked yet"
          description="Like a song from Discover, an artist page, or a playlist and it will show here."
          actionLabel="Browse discover"
          actionHref="/discover"
        />
      )}
    </div>
  );
}
