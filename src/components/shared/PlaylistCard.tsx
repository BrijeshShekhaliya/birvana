"use client";

import clsx from "clsx";
import Link from "next/link";
import { Disc3, Headphones, Radio } from "lucide-react";
import styles from "./PlaylistCard.module.css";
import { compactNumber } from "@/lib/format";
import { PlaylistSaveButton } from "@/components/shared/PlaylistSaveButton";
import { PlaylistArtwork } from "@/components/shared/PlaylistArtwork";
import type { Playlist } from "@/types/models";

export function PlaylistCard({
  playlist,
  initialSaved = false,
  showSaveButton = false,
  size = "default",
}: {
  playlist: Playlist;
  initialSaved?: boolean;
  showSaveButton?: boolean;
  size?: "default" | "compact" | "discover" | "library";
}) {
  const playlistLabel =
    playlist.visibility === "public"
      ? "Public collection"
      : playlist.visibility === "unlisted"
        ? "Unlisted mix"
        : "Private set";
  const description =
    playlist.description
    || (size === "compact"
      ? "Ready for the next listening session."
      : size === "library"
        ? "Ready to jump back into."
      : size === "discover"
        ? "A quick mix to drop into right now."
        : "A curated mix built for repeat plays.");

  return (
    <article
      className={clsx(
        styles.card,
        size === "compact" && styles.compact,
        size === "discover" && styles.discover,
        size === "library" && styles.library,
        showSaveButton && styles.withAction,
      )}
    >
      {showSaveButton ? (
        <div className={styles.saveDock}>
          <PlaylistSaveButton
            playlistId={playlist.id}
            initialSaved={initialSaved}
            compact
            iconOnly
          />
        </div>
      ) : null}

      <Link
        href={`/playlist/${playlist.id}`}
        className={clsx(
          styles.linkArea,
          size === "compact" && styles.linkAreaCompact,
          size === "discover" && styles.linkAreaDiscover,
          size === "library" && styles.linkAreaLibrary,
        )}
      >
        <div className={styles.coverWrap}>
          <PlaylistArtwork name={playlist.name} coverUrl={playlist.cover_url} />
          <div className={styles.coverOverlay} />
          <div className={styles.coverMeta}>
            <span className={styles.coverTag}>Playlist</span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.copy}>
            <div className={styles.kickerRow}>
              <span className={styles.kicker}>{playlistLabel}</span>
              {playlist.play_count > 0 ? (
                <span className={styles.kickerValue}>{compactNumber(playlist.play_count)} plays</span>
              ) : null}
            </div>
            <p className={styles.name}>{playlist.name}</p>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaPill}>
              <Disc3 size={14} strokeWidth={1.9} />
              <span>{playlist.song_count} tracks</span>
            </span>
            <span className={styles.metaPill}>
              <Headphones size={14} strokeWidth={1.9} />
              <span>{compactNumber(playlist.follower_count)} saves</span>
            </span>
            {(size === "default" || size === "library") && playlist.play_count > 0 ? (
              <span className={styles.metaPill}>
                <Radio size={14} strokeWidth={1.9} />
                <span>{compactNumber(playlist.play_count)} plays</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
