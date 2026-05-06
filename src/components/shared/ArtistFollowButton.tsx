"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { UserPlus } from "lucide-react";
import { toggleArtistFollowAction } from "@/app/actions";
import styles from "./ActionButton.module.css";

export function ArtistFollowButton({
  artistId,
  initialFollowing = false,
  compact = false,
}: {
  artistId: string;
  initialFollowing?: boolean;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const nextValue = !following;
    setFollowing(nextValue);

    startTransition(async () => {
      try {
        await toggleArtistFollowAction(artistId, nextValue);
      } catch (error) {
        console.error(error);
        setFollowing(!nextValue);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={clsx(styles.button, compact && styles.compact, following && styles.active)}
    >
      <UserPlus className={styles.icon} size={16} />
      <span className={styles.label}>{following ? "Following" : "Follow"}</span>
    </button>
  );
}
