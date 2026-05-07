"use client";

import Link from "next/link";
import styles from "./ArtistCard.module.css";
import { ArtistFollowButton } from "@/components/shared/ArtistFollowButton";
import { LazyImage } from "@/components/shared/LazyImage";
import type { CatalogArtist } from "@/types/models";

export function ArtistCard({
  artist,
  initialFollowing = false,
  showFollowButton = false,
}: {
  artist: CatalogArtist;
  initialFollowing?: boolean;
  showFollowButton?: boolean;
}) {
  const artistImage = artist.avatar_url || artist.hero_image_url;

  return (
    <article className={styles.card}>
      <Link href={`/artist/${artist.id}`} className={styles.linkArea}>
        <div className={styles.avatarWrap}>
          {artistImage ? (
            <LazyImage className={styles.avatar} src={artistImage} alt={artist.display_name} />
          ) : (
            <div className={styles.avatarFallback}>{artist.display_name.slice(0, 1)}</div>
          )}
        </div>

        <div className={styles.body}>
          <p className={styles.name}>{artist.display_name}</p>
          <p className={styles.meta}>Artist</p>
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
