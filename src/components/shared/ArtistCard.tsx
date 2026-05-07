"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./ArtistCard.module.css";
import { compactNumber } from "@/lib/format";
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
  return (
    <article className={styles.card}>
      <Link href={`/artist/${artist.id}`} className={styles.linkArea}>
        <div className={styles.hero}>
          {artist.hero_image_url ? (
            <LazyImage className={styles.heroImage} src={artist.hero_image_url} alt={artist.display_name} />
          ) : null}
          <div className={styles.heroShade} />
          <span className={styles.kicker}>Artist</span>
          <div className={styles.avatarWrap}>
            {artist.avatar_url ? (
              <LazyImage className={styles.avatar} src={artist.avatar_url} alt={artist.display_name} />
            ) : (
              <div className={styles.avatarFallback}>{artist.display_name.slice(0, 1)}</div>
            )}
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.name}>{artist.display_name}</p>
          <p className={styles.meta}>{compactNumber(artist.songs_count)} tracks in the catalog</p>
          <p className={styles.supporting}>
            {artist.contributor_label
              ? `Latest releases curated by ${artist.contributor_label}`
              : `${compactNumber(artist.total_plays)} plays across the public catalog`}
          </p>
          <span className={styles.detailLink}>
            Open artist
            <ArrowRight size={15} strokeWidth={2} />
          </span>
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
