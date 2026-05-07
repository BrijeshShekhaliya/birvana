import { notFound } from "next/navigation";
import { Disc3, Radio } from "lucide-react";
import { ArtistFollowButton } from "@/components/shared/ArtistFollowButton";
import styles from "./page.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { LazyImage } from "@/components/shared/LazyImage";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { TrackCard } from "@/components/shared/TrackCard";
import { compactNumber } from "@/lib/format";
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
        {artist.hero_image_url ? (
          <LazyImage className={styles.heroImage} src={artist.hero_image_url} alt={artist.display_name} eager />
        ) : null}
        <div className={styles.heroShade} />
        <div className={styles.heroBody}>
          <p className={styles.kicker}>Artist</p>
          <p className={styles.name}>{artist.display_name}</p>
          <p className={styles.bio}>{artist.bio || "This artist has not added a bio yet."}</p>

          <div className={styles.metrics}>
            <span>
              <Disc3 size={15} strokeWidth={2} />
              {compactNumber(artist.songs_count)} tracks
            </span>
            <span>
              <Radio size={15} strokeWidth={2} />
              {compactNumber(artist.total_plays)} plays
            </span>
          </div>

          {artist.contributor_label ? (
            <p className={styles.contributor}>Latest releases curated by {artist.contributor_label}</p>
          ) : null}

          {user ? (
            <div className={styles.actions}>
              <ArtistFollowButton
                artistId={artist.id}
                initialFollowing={followedArtistIds.has(artist.id)}
              />
            </div>
          ) : null}
        </div>
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
            description="This artist does not have any ready tracks visible in the public catalog yet."
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
            description="Album groupings will appear here when BIRVANA starts organizing this artist into release projects."
          />
        )}
      </section>
    </div>
  );
}
