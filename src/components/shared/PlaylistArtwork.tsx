"use client";

import type { CSSProperties } from "react";
import { LazyImage } from "@/components/shared/LazyImage";
import styles from "./PlaylistArtwork.module.css";

function getPlaylistTone(name: string) {
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = [
    ["#d8d0c0", "#f4eee3"],
    ["#d1c7bb", "#efe8dc"],
    ["#cfc8d7", "#f0edf8"],
    ["#c7d3d8", "#ecf3f5"],
    ["#d8cfc4", "#f7efe8"],
  ] as const;

  return palette[seed % palette.length];
}

export function PlaylistArtwork({
  name,
  coverUrl,
  variant = "card",
}: {
  name: string;
  coverUrl?: string | null;
  variant?: "card" | "hero";
}) {
  const [accent, accentSoft] = getPlaylistTone(name);

  return (
    <div
      className={`${styles.shell} ${variant === "hero" ? styles.hero : styles.card}`}
      style={
        {
          "--playlist-accent": accent,
          "--playlist-accent-soft": accentSoft,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className={styles.frame}>
        {coverUrl ? <LazyImage className={styles.image} src={coverUrl} alt="" eager={variant === "hero"} /> : null}
        <div className={styles.glow} />
        <div className={styles.overlay} />
        {!coverUrl ? (
          <div className={styles.fallback}>
            <div className={styles.tileGrid} aria-hidden="true">
              <span className={styles.tile} />
              <span className={styles.tile} />
              <span className={styles.tile} />
              <span className={styles.tile} />
            </div>
            <div className={styles.fallbackGlow} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
