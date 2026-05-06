"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Link2 } from "lucide-react";
import { useToast } from "@/components/shared/ToastProvider";
import styles from "./ActionButton.module.css";

export function SharePlaylistButton({
  playlistId,
  playlistName,
  compact = false,
  iconOnly = false,
}: {
  playlistId: string;
  playlistName: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [shared, setShared] = useState(false);
  const { notify } = useToast();

  const onClick = async () => {
    const url = `${window.location.origin}/playlist/${playlistId}`;
    const canUseNativeShare = "share" in navigator;

    try {
      if (canUseNativeShare) {
        await navigator.share({
          title: playlistName,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setShared(true);
      notify(canUseNativeShare ? "Share sheet opened." : "Playlist link copied.", "success");
      window.setTimeout(() => setShared(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      notify("Could not share this playlist.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shared ? "Playlist link copied" : "Share playlist"}
      className={clsx(styles.button, compact && styles.compact, shared && styles.active)}
    >
      {shared ? <Check className={styles.icon} size={16} /> : <Link2 className={styles.icon} size={16} />}
      {!iconOnly ? <span className={styles.label}>{shared ? "Copied" : "Share"}</span> : null}
    </button>
  );
}
