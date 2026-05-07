import styles from "./page.module.css";
import { ArtistCard } from "@/components/shared/ArtistCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { getArtists, getCurrentUser, getEngagementState } from "@/lib/data";

export default async function ArtistsPage() {
  const [user, artists] = await Promise.all([getCurrentUser(), getArtists()]);
  const engagement = user
    ? await getEngagementState({
        userId: user.id,
        artistIds: artists.map((artist) => artist.id),
      })
    : null;
  const followedArtistIds = new Set(engagement?.followedArtistIds ?? []);
  const followedArtists = artists.filter((artist) => followedArtistIds.has(artist.id));
  const featuredArtists = artists.filter((artist) => !followedArtistIds.has(artist.id));

  return (
    <div className={styles.page}>
      <SectionTitle
        eyebrow="Artists"
        title="Artists shaping the catalog"
        meta={`${artists.length} in the catalog`}
      />

      {!artists.length ? (
        <EmptyState
          title="No artists yet"
          description="Artist profiles appear here after published songs are added to the public catalog."
        />
      ) : null}

      {followedArtists.length ? (
        <section className={styles.section}>
          <SectionTitle eyebrow="Following" title="Artists you already follow" meta={`${followedArtists.length} saved`} />
          <div className={styles.grid}>
            {followedArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                initialFollowing
                showFollowButton={Boolean(user)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {featuredArtists.length ? (
        <section className={styles.section}>
          <SectionTitle
            eyebrow="Explore"
            title={followedArtists.length ? "More artists from the catalog" : "Find new artists to follow"}
            meta={`${featuredArtists.length} available`}
          />
          <div className={styles.grid}>
            {featuredArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                initialFollowing={followedArtistIds.has(artist.id)}
                showFollowButton={Boolean(user)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
