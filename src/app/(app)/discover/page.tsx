import { DiscoverWorkspace } from "@/components/discover/DiscoverWorkspace";
import { getCurrentUser, getDiscoverData, getEngagementState } from "@/lib/data";

export default async function DiscoverPage() {
  const [user, { tracks, playlists }] = await Promise.all([getCurrentUser(), getDiscoverData()]);
  const engagement = user
    ? await getEngagementState({
        userId: user.id,
        songIds: tracks.map((track) => track.id),
        playlistIds: playlists.map((playlist) => playlist.id),
      })
    : null;

  return (
    <DiscoverWorkspace
      tracks={tracks}
      playlists={playlists}
      likedSongIds={engagement?.likedSongIds ?? []}
      savedPlaylistIds={engagement?.savedPlaylistIds ?? []}
      canEngage={Boolean(user)}
      currentUserId={user?.id}
    />
  );
}
