import {
  CheckCircle2,
  Disc3,
  Globe2,
  Headphones,
  ListMusic,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "./page.module.css";
import { LazyImage } from "@/components/shared/LazyImage";
import { getAdminDashboardData } from "@/lib/data";
import { compactNumber, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

function visibilityIcon(visibility: string) {
  if (visibility === "public") {
    return <Globe2 size={14} strokeWidth={1.9} />;
  }

  if (visibility === "unlisted") {
    return <Radio size={14} strokeWidth={1.9} />;
  }

  return <LockKeyhole size={14} strokeWidth={1.9} />;
}

export default async function AdminPage() {
  const data = await getAdminDashboardData();
  const publishingRate = data.stats.tracks
    ? Math.round((data.stats.readyTracks / data.stats.tracks) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title}>Platform control room</h1>
          <p className={styles.copy}>
            Review the catalog, spot upload health, and keep the music surface clean.
          </p>
        </div>

        <div className={styles.accessBadge}>
          <ShieldCheck size={18} strokeWidth={1.9} />
          <span>{data.accessMode === "service" ? "Service access" : data.accessMode === "session" ? "Session access" : "Not configured"}</span>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Platform overview">
        <div className={styles.stat}>
          <Users size={18} strokeWidth={1.9} />
          <span>Users</span>
          <strong>{compactNumber(data.stats.users)}</strong>
        </div>
        <div className={styles.stat}>
          <Disc3 size={18} strokeWidth={1.9} />
          <span>Tracks</span>
          <strong>{compactNumber(data.stats.tracks)}</strong>
        </div>
        <div className={styles.stat}>
          <ListMusic size={18} strokeWidth={1.9} />
          <span>Playlists</span>
          <strong>{compactNumber(data.stats.playlists)}</strong>
        </div>
        <div className={styles.stat}>
          <Headphones size={18} strokeWidth={1.9} />
          <span>Total plays</span>
          <strong>{compactNumber(data.stats.plays)}</strong>
        </div>
      </section>

      <section className={styles.health}>
        <div className={styles.healthCopy}>
          <p className={styles.eyebrow}>Catalog health</p>
          <h2>{publishingRate}% ready</h2>
          <p>
            {compactNumber(data.stats.readyTracks)} of {compactNumber(data.stats.tracks)} tracks are playable.
            {data.stats.publicPlaylists ? ` ${compactNumber(data.stats.publicPlaylists)} playlists are public.` : ""}
          </p>
        </div>
        <div className={styles.progressTrack} aria-label={`${publishingRate}% of tracks are ready`}>
          <span style={{ width: `${publishingRate}%` }} />
        </div>
      </section>

      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Uploads</p>
              <h2>Recent tracks</h2>
            </div>
            <span>{data.recentTracks.length} shown</span>
          </div>

          <div className={styles.rows}>
            {data.recentTracks.map((track) => (
              <article className={styles.trackRow} key={track.id}>
                {track.cover_url ? (
                  <LazyImage src={track.cover_url} alt={track.title} className={styles.cover} />
                ) : (
                  <div className={styles.coverFallback}>{track.title.slice(0, 1)}</div>
                )}
                <div className={styles.rowText}>
                  <strong>{track.title}</strong>
                  <span>{track.artist_display}</span>
                </div>
                <div className={styles.rowMeta}>
                  <span>{formatDuration(track.duration_seconds)}</span>
                  <span>{compactNumber(track.play_count)} plays</span>
                </div>
                <div className={styles.status}>
                  <CheckCircle2 size={14} strokeWidth={1.9} />
                  <span>{track.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Collections</p>
              <h2>Playlist activity</h2>
            </div>
            <span>{data.recentPlaylists.length} shown</span>
          </div>

          <div className={styles.playlistGrid}>
            {data.recentPlaylists.map((playlist) => (
              <article className={styles.playlistCard} key={playlist.id}>
                <div className={styles.playlistTop}>
                  <span className={styles.visibility}>
                    {visibilityIcon(playlist.visibility)}
                    {playlist.visibility}
                  </span>
                  <span>{playlist.song_count} tracks</span>
                </div>
                <strong>{playlist.name}</strong>
                <p>{playlist.description || "No description added yet."}</p>
                <div className={styles.playlistStats}>
                  <span>{compactNumber(playlist.follower_count)} saves</span>
                  <span>{compactNumber(playlist.play_count)} plays</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.artistsPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Artists</p>
              <h2>Top creators</h2>
            </div>
          </div>

          <div className={styles.artistList}>
            {data.topArtists.map((artist) => (
              <article className={styles.artistRow} key={artist.id}>
                <div className={styles.avatar}>
                  {artist.avatar_url ? (
                    <LazyImage src={artist.avatar_url} alt={artist.display_name} />
                  ) : (
                    <span>{artist.display_name.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <strong>{artist.display_name}</strong>
                  <span>{compactNumber(artist.followers_count)} followers</span>
                </div>
                <span>{compactNumber(artist.songs_count)} songs</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
