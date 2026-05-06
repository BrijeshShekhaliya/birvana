"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  movePlaylistTrackAction,
  removeTrackFromPlaylistAction,
} from "@/app/actions";
import styles from "./PlaylistTrackControls.module.css";

export function PlaylistTrackControls({
  playlistTrackId,
  canMoveUp,
  canMoveDown,
}: {
  playlistTrackId: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const runAction = (action: () => Promise<unknown>) => {
    setError("");
    startTransition(async () => {
      try {
        await action();
      } catch (nextError) {
        console.error(nextError);
        setError("Update failed. Try again.");
      }
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          disabled={pending || !canMoveUp}
          aria-label="Move track up"
          title="Move up"
          onClick={() => runAction(() => movePlaylistTrackAction(playlistTrackId, "up"))}
        >
          <ArrowUp size={16} />
          <span className={styles.srOnly}>Up</span>
        </button>

        <button
          type="button"
          className={styles.button}
          disabled={pending || !canMoveDown}
          aria-label="Move track down"
          title="Move down"
          onClick={() => runAction(() => movePlaylistTrackAction(playlistTrackId, "down"))}
        >
          <ArrowDown size={16} />
          <span className={styles.srOnly}>Down</span>
        </button>

        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          disabled={pending}
          aria-label="Remove track"
          title="Remove"
          onClick={() => runAction(() => removeTrackFromPlaylistAction(playlistTrackId))}
        >
          <Trash2 size={16} />
          <span className={styles.srOnly}>Remove</span>
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
