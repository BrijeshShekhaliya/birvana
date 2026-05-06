export type Visibility = "private" | "unlisted" | "public";
export type MediaStatus = "uploading" | "processing" | "ready" | "failed";

export interface Profile {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_artist: boolean;
  verified_artist: boolean;
  followers_count: number;
  following_count: number;
  songs_count: number;
  public_playlists_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileOverview {
  profile: Profile | null;
  stats: {
    uploadedTracks: number;
    publicTracks: number;
    readyTracks: number;
    totalPlays: number;
    totalLikes: number;
    ownedPlaylists: number;
    publicPlaylists: number;
    likedSongs: number;
    savedPlaylists: number;
    following: number;
  };
  recentTracks: Track[];
  recentPlaylists: Playlist[];
}

export interface Album {
  id: string;
  artist_id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  visibility: Visibility;
  release_date?: string | null;
}

export interface Track {
  id: number;
  artist_id: string;
  album_id?: string | null;
  title: string;
  artist_display: string;
  description?: string | null;
  visibility: Visibility;
  status: MediaStatus;
  audio_url?: string | null;
  audio_path?: string | null;
  cover_url?: string | null;
  cover_path?: string | null;
  duration_seconds?: number | null;
  play_count: number;
  like_count: number;
  created_at?: string;
}

export interface Playlist {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  visibility: Visibility;
  share_token: string;
  cover_url?: string | null;
  cover_path?: string | null;
  is_collaborative: boolean;
  song_count: number;
  follower_count: number;
  play_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: string;
  song_id: number;
  position: number;
  added_by?: string | null;
  track?: Track | null;
}
