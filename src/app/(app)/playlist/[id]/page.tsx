import { notFound } from "next/navigation";
import { PlaylistPageShell } from "@/components/playlist/PlaylistPageShell";
import styles from "./page.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  getAddablePlaylistTracks,
  getCurrentUser,
  getEngagementState,
  getPlaylistDetail,
} from "@/lib/data";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { playlist, tracks, entries } = await getPlaylistDetail(id);

  if (!playlist) {
    notFound();
  }

  const isOwner = Boolean(user && playlist.owner_id === user.id);
  const playlistSongIds = new Set(entries.map((entry) => entry.song_id));
  const [catalogTracks, engagement] = await Promise.all([
    isOwner ? getAddablePlaylistTracks(user!.id) : Promise.resolve([]),
    user
      ? getEngagementState({
          userId: user.id,
          songIds: tracks.map((track) => track.id),
          playlistIds: [playlist.id],
        })
      : Promise.resolve(null),
  ]);
  const addableTracks = catalogTracks.filter((track) => track.status === "ready" && !playlistSongIds.has(track.id));

  return (
    <div className={styles.page}>
      <PlaylistPageShell
        playlist={playlist}
        entries={entries}
        likedSongIds={engagement?.likedSongIds ?? []}
        addableTracks={addableTracks}
        isOwner={isOwner}
        isSaved={Boolean(engagement?.savedPlaylistIds.includes(playlist.id))}
        canLike={Boolean(user)}
      />

      {!tracks.length ? (
        <section className={styles.emptyState}>
          <EmptyState
            title="This playlist is empty"
            description={
              isOwner
                ? "Open manage songs and add tracks from your library to start the playlist."
                : "The owner has not added any songs yet."
            }
          />
        </section>
      ) : null}
    </div>
  );
}
