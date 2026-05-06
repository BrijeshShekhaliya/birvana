"use client";

import type { ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { TrackLikeButton } from "@/components/shared/TrackLikeButton";
import { usePlayerPlayback } from "@/components/player/PlayerProvider";
import type { QueueContext } from "@/components/player/PlayerProvider";
import { LazyImage } from "@/components/shared/LazyImage";
import { compactNumber, formatDuration } from "@/lib/format";
import type { Track } from "@/types/models";
import styles from "./PlaylistTrackItem.module.css";

export function PlaylistTrackItem({
  track,
  tracks,
  index,
  initialLiked = false,
  showLikeButton = false,
  queueKey,
  queueContext,
  menu,
}: {
  track: Track;
  tracks: Track[];
  index: number;
  initialLiked?: boolean;
  showLikeButton?: boolean;
  queueKey: string;
  queueContext?: QueueContext;
  menu?: ReactNode;
}) {
  const { currentTrack, playing, playTracks, queueKey: activeQueueKey, togglePlayback } = usePlayerPlayback();
  const active = currentTrack?.id === track.id;
  const sameQueue = activeQueueKey === queueKey;
  const showPlayingState = active && sameQueue && playing;

  const handlePlay = () => {
    if (active && sameQueue) {
      togglePlayback();
      return;
    }

    playTracks(tracks, index, queueKey, { queueContext });
  };

  return (
    <article className={`${styles.row} ${active && sameQueue ? styles.rowActive : ""}`}>
      <div className={styles.coverWrap}>
        {track.cover_url ? (
          <LazyImage className={styles.cover} src={track.cover_url} alt={track.title} />
        ) : (
          <div className={styles.coverFallback}>{track.title.slice(0, 1)}</div>
        )}
        <button
          type="button"
          className={styles.playButton}
          onClick={handlePlay}
          aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {showPlayingState ? (
            <span className={styles.playingBars} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : active && sameQueue ? (
            <Pause size={15} strokeWidth={2.2} />
          ) : (
            <Play size={15} strokeWidth={2.2} />
          )}
        </button>
      </div>

      <div className={styles.main}>
        <div className={styles.copy}>
          <p className={styles.name}>{track.title}</p>
          <p className={styles.artist}>{track.artist_display}</p>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.order}>{String(index + 1).padStart(2, "0")}</span>
          <span>{formatDuration(track.duration_seconds)}</span>
          <span className={styles.plays}>{compactNumber(track.play_count)} plays</span>
        </div>
      </div>

      {showLikeButton || menu ? (
        <div className={styles.actions}>
          {showLikeButton ? (
            <TrackLikeButton songId={track.id} initialLiked={initialLiked} compact iconOnly />
          ) : null}
          {menu}
        </div>
      ) : null}
    </article>
  );
}
