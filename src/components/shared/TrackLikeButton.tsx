"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Heart } from "lucide-react";
import { toggleSongLikeAction } from "@/app/actions";
import { useToast } from "@/components/shared/ToastProvider";
import styles from "./ActionButton.module.css";

export function TrackLikeButton({
  songId,
  initialLiked = false,
  compact = false,
  iconOnly = false,
}: {
  songId: number;
  initialLiked?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  const onClick = () => {
    const nextValue = !liked;
    setLiked(nextValue);

    startTransition(async () => {
      try {
        await toggleSongLikeAction(songId, nextValue);
        notify(nextValue ? "Added to liked songs." : "Removed from liked songs.", "success");
      } catch (error) {
        console.error(error);
        setLiked(!nextValue);
        notify("Could not update this song.", "error");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike song" : "Like song"}
      className={clsx(styles.button, compact && styles.compact, liked && styles.active)}
    >
      <Heart className={styles.icon} size={16} fill={liked ? "currentColor" : "none"} />
      {!iconOnly ? <span className={styles.label}>{liked ? "Liked" : "Like"}</span> : null}
    </button>
  );
}
