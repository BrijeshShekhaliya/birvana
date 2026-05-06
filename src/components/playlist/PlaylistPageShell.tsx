"use client";

import { useEffect, useMemo, useState } from "react";
import { ListMusic, PencilLine, Search } from "lucide-react";
import { PlaylistHeroPlayer } from "@/components/playlist/PlaylistHeroPlayer";
import { PlaylistModal } from "@/components/playlist/PlaylistModal";
import { PlaylistSettingsPanel } from "@/components/playlist/PlaylistSettingsPanel";
import { PlaylistTrackList } from "@/components/playlist/PlaylistTrackList";
import { PlaylistAddTrackPanel } from "@/components/playlist/PlaylistAddTrackPanel";
import { PlaylistArtwork } from "@/components/shared/PlaylistArtwork";
import { PlaylistSaveButton } from "@/components/shared/PlaylistSaveButton";
import { SharePlaylistButton } from "@/components/shared/SharePlaylistButton";
import type { Playlist, PlaylistTrack, Track } from "@/types/models";
import styles from "./PlaylistPageShell.module.css";

export function PlaylistPageShell({
  playlist,
  entries,
  likedSongIds,
  addableTracks,
  isOwner,
  isSaved,
  canLike,
}: {
  playlist: Playlist;
  entries: PlaylistTrack[];
  likedSongIds: number[];
  addableTracks: Track[];
  isOwner: boolean;
  isSaved: boolean;
  canLike: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [songsOpen, setSongsOpen] = useState(false);
  const [songsView, setSongsView] = useState<"order" | "add">("order");
  const [manageQuery, setManageQuery] = useState("");
  const [currentEntries, setCurrentEntries] = useState(entries);
  const [currentAddableTracks, setCurrentAddableTracks] = useState(addableTracks);

  useEffect(() => {
    setCurrentEntries(entries);
  }, [entries]);

  useEffect(() => {
    setCurrentAddableTracks(addableTracks);
  }, [addableTracks]);

  const currentTracks = useMemo(
    () => currentEntries.map((entry) => entry.track).filter(Boolean) as Track[],
    [currentEntries],
  );
  const trackCountLabel = useMemo(() => `${currentTracks.length} total`, [currentTracks.length]);

  const handleTrackAdded = (track: Track, playlistTrackId: number, position: number) => {
    setCurrentEntries((current) =>
      [...current, { id: playlistTrackId, playlist_id: playlist.id, song_id: track.id, position, track }].sort(
        (left, right) => left.position - right.position,
      ),
    );
    setCurrentAddableTracks((current) => current.filter((item) => item.id !== track.id));
  };

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.coverWrap}>
          <PlaylistArtwork name={playlist.name} coverUrl={playlist.cover_url} variant="hero" />
        </div>

        <div className={styles.heroCopy}>
          <div className={styles.titleBlock}>
            <span className={styles.visibility}>{playlist.visibility}</span>
            <h1 className={styles.title}>{playlist.name}</h1>
            {playlist.description ? <p className={styles.description}>{playlist.description}</p> : null}
            <div className={styles.metaSummary}>
              <span>{currentTracks.length} tracks</span>
              <span>{playlist.follower_count} saves</span>
              <span>{playlist.play_count} plays</span>
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <PlaylistHeroPlayer playlistId={playlist.id} playlistName={playlist.name} tracks={currentTracks} />

          <div className={styles.iconRow}>
            {!isOwner && canLike ? (
              <div className={styles.iconButtonWrap} title={isSaved ? "Saved to library" : "Save playlist"}>
                <PlaylistSaveButton playlistId={playlist.id} initialSaved={isSaved} compact iconOnly />
              </div>
            ) : null}

            {isOwner ? (
              <>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Edit playlist details"
                  aria-label="Edit playlist details"
                  onClick={() => setSettingsOpen(true)}
                >
                  <PencilLine size={18} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Manage songs"
                  aria-label="Manage songs"
                  onClick={() => {
                    setSongsView("order");
                    setSongsOpen(true);
                  }}
                >
                  <ListMusic size={18} />
                </button>
              </>
            ) : null}

            <div className={styles.iconButtonWrap} title="Share playlist">
              <SharePlaylistButton playlistId={playlist.id} playlistName={playlist.name} compact iconOnly />
            </div>
          </div>
        </div>
      </section>

      {currentTracks.length ? (
        <section className={styles.trackSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Tracks</p>
              <h2 className={styles.sectionTitle}>Playlist songs</h2>
            </div>
            <p className={styles.sectionMeta}>{currentTracks.length} total</p>
          </div>
          <div className={styles.trackList}>
            <PlaylistTrackList
              playlistId={playlist.id}
              playlistName={playlist.name}
              entries={currentEntries}
              likedSongIds={likedSongIds}
              showLikeButton={canLike}
              isOwner={false}
            />
          </div>
        </section>
      ) : null}

      {isOwner ? (
        <>
          <PlaylistModal title="Edit playlist details" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
            <PlaylistSettingsPanel playlist={playlist} />
          </PlaylistModal>

          <PlaylistModal title="Manage playlist songs" open={songsOpen} onClose={() => setSongsOpen(false)}>
            <div className={styles.manageShell}>
              <div className={styles.modalTabs}>
                <button
                  type="button"
                  className={`${styles.modalTab} ${songsView === "order" ? styles.modalTabActive : ""}`}
                  aria-pressed={songsView === "order"}
                  onClick={() => setSongsView("order")}
                >
                  <ListMusic size={16} />
                  <span>Current songs</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modalTab} ${songsView === "add" ? styles.modalTabActive : ""}`}
                  aria-pressed={songsView === "add"}
                  onClick={() => setSongsView("add")}
                >
                  <Search size={16} />
                  <span>Add songs</span>
                </button>
              </div>

              {songsView === "order" ? (
                <div className={styles.modalList}>
                  <div className={styles.modalSectionHeader}>
                    <span className={styles.modalEyebrow}>Tracks</span>
                    <p className={styles.modalMeta}>{trackCountLabel}</p>
                  </div>
                  <label className={styles.modalSearch}>
                    <Search size={16} />
                    <input
                      type="search"
                      value={manageQuery}
                      onChange={(event) => setManageQuery(event.target.value)}
                      placeholder="Search current songs"
                      aria-label="Search current songs"
                    />
                  </label>
                  <div className={styles.modalTrackList}>
                    <PlaylistTrackList
                      playlistId={playlist.id}
                      playlistName={playlist.name}
                      entries={currentEntries}
                      likedSongIds={likedSongIds}
                      showLikeButton={false}
                      isOwner
                      searchQuery={manageQuery}
                      onEntriesChange={setCurrentEntries}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.modalAdd}>
                  <PlaylistAddTrackPanel
                    playlistId={playlist.id}
                    tracks={currentAddableTracks}
                    onTrackAdded={handleTrackAdded}
                  />
                </div>
              )}
            </div>
          </PlaylistModal>
        </>
      ) : null}
    </>
  );
}
