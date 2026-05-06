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

  return (
    <div className={styles.page}>
      <SectionTitle
        eyebrow="Artists"
        title="People behind the music"
        meta={`${artists.length} listed`}
      />
      {artists.length ? (
        <div className={styles.grid}>
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              initialFollowing={followedArtistIds.has(artist.id)}
              showFollowButton={Boolean(user) && artist.id !== user?.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No artists yet"
          description="Artist profiles appear here after their first release is published."
        />
      )}
    </div>
  );
}
