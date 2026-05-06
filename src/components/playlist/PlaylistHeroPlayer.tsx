"use client";

import { Pause, Play } from "lucide-react";
import { usePlayerPlayback } from "@/components/player/PlayerProvider";
import type { Track } from "@/types/models";
import styles from "./PlaylistHeroPlayer.module.css";

export function PlaylistHeroPlayer({
  playlistId,
  playlistName,
  tracks,
}: {
  playlistId: string;
  playlistName: string;
  tracks: Track[];
}) {
  const { currentTrack, playing, playTracks, queueKey, togglePlayback } = usePlayerPlayback();
  const resolvedQueueKey = `playlist:${playlistId}`;
  const sameQueue = queueKey === resolvedQueueKey;

  const onPlay = () => {
    if (sameQueue && currentTrack) {
      togglePlayback();
      return;
    }

    if (!tracks.length) {
      return;
    }

    playTracks(tracks, 0, resolvedQueueKey, {
      resumeQueue: true,
      queueContext: {
        kind: "playlist",
        label: playlistName,
        href: `/playlist/${playlistId}`,
      },
    });
  };

  return (
    <button
      type="button"
      className={styles.button}
      onClick={onPlay}
      disabled={!tracks.length}
      title={sameQueue && playing ? "Pause playlist" : "Play playlist"}
      aria-label={sameQueue && playing ? "Pause playlist" : "Play playlist"}
    >
      <span className={styles.iconWrap}>
        {sameQueue && playing ? <Pause size={22} strokeWidth={2.3} /> : <Play size={22} strokeWidth={2.3} />}
      </span>
    </button>
  );
}
