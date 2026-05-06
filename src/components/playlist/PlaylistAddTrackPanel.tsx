"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, Search } from "lucide-react";
import { addTrackToPlaylistAction } from "@/app/actions";
import { LazyImage } from "@/components/shared/LazyImage";
import { useToast } from "@/components/shared/ToastProvider";
import type { Track } from "@/types/models";
import { formatDuration } from "@/lib/format";
import styles from "./PlaylistAddTrackPanel.module.css";

export function PlaylistAddTrackPanel({
  playlistId,
  tracks,
  onTrackAdded,
}: {
  playlistId: string;
  tracks: Track[];
  onTrackAdded?: (track: Track, playlistTrackId: number, position: number) => void;
}) {
  const [availableTracks, setAvailableTracks] = useState(tracks);
  const [pendingTrackId, setPendingTrackId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const { notify } = useToast();

  useEffect(() => {
    setAvailableTracks(tracks);
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTracks;
    }

    return availableTracks.filter((track) =>
      `${track.title} ${track.artist_display}`.toLowerCase().includes(normalizedQuery),
    );
  }, [availableTracks, deferredQuery]);

  const addTrack = (trackId: number) => {
    setError("");
    setStatus("Adding song to playlist...");
    setPendingTrackId(trackId);
    const previousTracks = availableTracks;
    setAvailableTracks((current) => current.filter((track) => track.id !== trackId));

    startTransition(async () => {
      try {
        const result = await addTrackToPlaylistAction(playlistId, trackId);
        const addedTrack = previousTracks.find((track) => track.id === trackId);

        if (result && addedTrack) {
          onTrackAdded?.(addedTrack, result.id, result.position);
          setStatus(`${addedTrack.title} added.`);
          notify(`${addedTrack.title} added to playlist.`, "success");
        } else if (addedTrack) {
          setStatus(`${addedTrack.title} is already in this playlist.`);
        }
      } catch (nextError) {
        console.error(nextError);
        setAvailableTracks(previousTracks);
        const message = nextError instanceof Error ? nextError.message : "Could not add track to playlist.";
        setError(message);
        setStatus("");
        notify(message, "error");
      } finally {
        setPendingTrackId(null);
        window.setTimeout(() => setStatus(""), 1800);
      }
    });
  };

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Add songs</h2>
        <p className={styles.meta}>{filteredTracks.length} shown</p>
      </div>

      {status ? (
        <div className={styles.status} role="status" aria-live="polite">
          {pendingTrackId ? <Loader2 size={16} className={styles.spin} /> : <CheckCircle2 size={16} />}
          <span>{status}</span>
        </div>
      ) : null}

      <label className={styles.search}>
        <Search size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search songs"
          aria-label="Search songs"
        />
      </label>

      {filteredTracks.length ? (
        <div className={styles.list}>
          {filteredTracks.map((track) => {
            const busy = isPending && pendingTrackId === track.id;

            return (
              <article key={track.id} className={styles.row}>
                <div className={styles.trackMeta}>
                  <div className={styles.thumbWrap}>
                    {track.cover_url ? (
                      <LazyImage className={styles.thumb} src={track.cover_url} alt={track.title} />
                    ) : (
                      <div className={styles.thumbFallback}>{track.title.slice(0, 1)}</div>
                    )}
                  </div>

                  <div className={styles.copy}>
                    <p className={styles.name}>{track.title}</p>
                    <p className={styles.subtle}>{track.artist_display}</p>
                  </div>
                </div>

                <p className={styles.duration}>{formatDuration(track.duration_seconds)}</p>

                <button
                  type="button"
                  className={styles.button}
                  disabled={busy}
                  aria-label={busy ? `Adding ${track.title}` : `Add ${track.title}`}
                  onClick={() => addTrack(track.id)}
                >
                  <Plus size={16} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{tracks.length ? "No matching songs" : "No songs available"}</p>
          <p className={styles.emptyText}>
            {tracks.length
              ? "Try a different search term."
              : "Ready public songs will appear here when they are available in the catalog."}
          </p>
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
