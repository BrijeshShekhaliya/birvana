"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Bookmark } from "lucide-react";
import { togglePlaylistSaveAction } from "@/app/actions";
import { useToast } from "@/components/shared/ToastProvider";
import styles from "./ActionButton.module.css";

export function PlaylistSaveButton({
  playlistId,
  initialSaved = false,
  compact = false,
  iconOnly = false,
}: {
  playlistId: string;
  initialSaved?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  const onClick = () => {
    const nextValue = !saved;
    setSaved(nextValue);

    startTransition(async () => {
      try {
        await togglePlaylistSaveAction(playlistId, nextValue);
        notify(nextValue ? "Playlist saved." : "Playlist removed.", "success");
      } catch (error) {
        console.error(error);
        setSaved(!nextValue);
        notify("Could not update this playlist.", "error");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove playlist from library" : "Save playlist to library"}
      className={clsx(styles.button, compact && styles.compact, saved && styles.active)}
    >
      <Bookmark className={styles.icon} size={16} fill={saved ? "currentColor" : "none"} />
      {!iconOnly ? <span className={styles.label}>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
