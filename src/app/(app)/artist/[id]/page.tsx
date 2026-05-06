import { notFound } from "next/navigation";
import { ArtistFollowButton } from "@/components/shared/ArtistFollowButton";
import styles from "./page.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { TrackCard } from "@/components/shared/TrackCard";
import { getArtistDetail, getCurrentUser, getEngagementState } from "@/lib/data";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, { artist, tracks, albums }] = await Promise.all([getCurrentUser(), getArtistDetail(id)]);

  if (!artist) {
    notFound();
  }

  const engagement = user
    ? await getEngagementState({
        userId: user.id,
        songIds: tracks.map((track) => track.id),
        artistIds: [artist.id],
      })
    : null;
  const likedSongIds = new Set(engagement?.likedSongIds ?? []);
  const followedArtistIds = new Set(engagement?.followedArtistIds ?? []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.name}>{artist.display_name}</p>
        <p className={styles.bio}>{artist.bio || "This artist has not added a bio yet."}</p>
        {user && artist.id !== user.id ? (
          <div className={styles.actions}>
            <ArtistFollowButton
              artistId={artist.id}
              initialFollowing={followedArtistIds.has(artist.id)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <SectionTitle eyebrow="Tracks" title="Available songs" meta={`${tracks.length} ready`} />
        {tracks.length ? (
          <div className={styles.tracks}>
            {tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                tracks={tracks}
                index={index}
                variant="row"
                queueKey={`artist:${artist.id}`}
                initialLiked={likedSongIds.has(track.id)}
                showLikeButton={Boolean(user)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No released songs"
            description="This artist does not have any ready tracks visible yet."
          />
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Albums" title="Releases" meta={`${albums.length} listed`} />
        {albums.length ? (
          <div className={styles.albums}>
            {albums.map((album) => (
              <article key={album.id} className={styles.albumCard}>
                <p className={styles.albumTitle}>{album.title}</p>
                <p className={styles.albumMeta}>{album.release_date || "Release date not set"}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No albums yet"
            description="Album releases will appear here once the artist starts grouping songs."
          />
        )}
      </section>
    </div>
  );
}
