"use client";

import Link from "next/link";
import styles from "./ArtistCard.module.css";
import { compactNumber } from "@/lib/format";
import { ArtistFollowButton } from "@/components/shared/ArtistFollowButton";
import { LazyImage } from "@/components/shared/LazyImage";
import type { Profile } from "@/types/models";

export function ArtistCard({
  artist,
  initialFollowing = false,
  showFollowButton = false,
}: {
  artist: Profile;
  initialFollowing?: boolean;
  showFollowButton?: boolean;
}) {
  return (
    <article className={styles.card}>
      <Link href={`/artist/${artist.id}`} className={styles.linkArea}>
        <div className={styles.avatarWrap}>
          {artist.avatar_url ? (
            <LazyImage className={styles.avatar} src={artist.avatar_url} alt={artist.display_name} />
          ) : (
            <div className={styles.avatarFallback}>{artist.display_name.slice(0, 1)}</div>
          )}
        </div>

        <div className={styles.body}>
          <p className={styles.name}>{artist.display_name}</p>
          <p className={styles.meta}>
            {compactNumber(artist.followers_count)} followers / {artist.songs_count} tracks
          </p>
        </div>
      </Link>

      {showFollowButton ? (
        <div className={styles.actions}>
          <ArtistFollowButton artistId={artist.id} initialFollowing={initialFollowing} compact />
        </div>
      ) : null}
    </article>
  );
}
