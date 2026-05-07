import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getFollowedArtistIds } from "@/lib/auth/account-state";
import { DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { getPublicSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import type { Album, CatalogArtist, Playlist, PlaylistTrack, Profile, ProfileOverview, Track } from "@/types/models";

type DiscoverData = {
  tracks: Track[];
  playlists: Playlist[];
};

type LibraryData = {
  ownedPlaylists: Playlist[];
  savedPlaylists: Playlist[];
};

type EngagementInput = {
  userId: string;
  songIds?: number[];
  playlistIds?: string[];
  artistIds?: string[];
};

type EngagementState = {
  likedSongIds: number[];
  savedPlaylistIds: string[];
  followedArtistIds: string[];
};

type SupabaseQueryClient = NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>;

export type AdminDashboardData = {
  accessMode: "service" | "session" | "unconfigured";
  stats: {
    users: number;
    artists: number;
    tracks: number;
    readyTracks: number;
    playlists: number;
    publicPlaylists: number;
    plays: number;
  };
  users: Profile[];
  recentTracks: Track[];
  recentPlaylists: Playlist[];
  topArtists: Profile[];
};

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

function normalizeArtistId(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "artist";
}

function buildArtistId(name: string) {
  return `catalog:${normalizeArtistId(name)}`;
}

function buildCatalogArtistBio(name: string, trackCount: number, contributorLabel?: string | null) {
  const parts = [
    `${name} is part of the BIRVANA catalog.`,
    `${trackCount} ${trackCount === 1 ? "track is" : "tracks are"} currently available.`,
  ];

  if (contributorLabel) {
    parts.push(`Latest releases are being curated by ${contributorLabel}.`);
  }

  return parts.join(" ");
}

const TRACK_CARD_FIELDS = [
  "id",
  "artist_id",
  "title",
  "artist_display",
  "visibility",
  "status",
  "audio_url",
  "audio_path",
  "cover_url",
  "cover_path",
  "duration_seconds",
  "play_count",
  "like_count",
  "created_at",
].join(",");

const PLAYLIST_CARD_FIELDS = [
  "id",
  "owner_id",
  "name",
  "description",
  "visibility",
  "cover_url",
  "cover_path",
  "song_count",
  "follower_count",
  "play_count",
  "share_token",
].join(",");

const ARTIST_CARD_FIELDS = [
  "id",
  "display_name",
  "avatar_url",
  "followers_count",
  "songs_count",
].join(",");

async function getPublicCacheSupabase(): Promise<SupabaseQueryClient | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const adminSupabase = await getAdminSupabase();

    if (adminSupabase) {
      return adminSupabase;
    }
  } catch {
    // Public catalog reads can still use the anon client when the service key is unavailable.
  }

  const { url, anonKey } = getPublicSupabaseEnv();

  return createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseQueryClient;
}

async function getUserCacheSupabase() {
  try {
    return await getAdminSupabase();
  } catch {
    return null;
  }
}

async function fetchProfileOverview(supabase: SupabaseQueryClient, userId: string): Promise<ProfileOverview> {
  const [
    profileResult,
    tracksResult,
    ownedPlaylistsResult,
    publicPlaylistsResult,
    likedResult,
    savedResult,
    followingResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("songs")
      .select("id,visibility,status,play_count,like_count")
      .eq("artist_id", userId)
      .not("audio_path", "is", null),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("visibility", "public"),
    supabase.from("liked_songs").select("song_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("saved_playlists")
      .select("playlist_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("artist_follows")
      .select("artist_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const tracks = (tracksResult.data as Array<{
    visibility: string | null;
    status: string | null;
    play_count: number | null;
    like_count: number | null;
  }> | null) ?? [];

  return {
    profile: (profileResult.data as Profile | null) ?? null,
    stats: {
      uploadedTracks: tracks.length,
      publicTracks: tracks.filter((track) => track.visibility === "public").length,
      readyTracks: tracks.filter((track) => track.status === "ready").length,
      totalPlays: tracks.reduce((sum, track) => sum + (track.play_count ?? 0), 0),
      totalLikes: tracks.reduce((sum, track) => sum + (track.like_count ?? 0), 0),
      ownedPlaylists: ownedPlaylistsResult.count ?? 0,
      publicPlaylists: publicPlaylistsResult.count ?? 0,
      likedSongs: likedResult.count ?? 0,
      savedPlaylists: savedResult.count ?? 0,
      following: followingResult.count ?? 0,
    },
    recentTracks: [],
    recentPlaylists: [],
  };
}

async function fetchDiscoverData(supabase: SupabaseQueryClient): Promise<DiscoverData> {
  const tracksPromise = supabase
    .from("songs")
    .select(TRACK_CARD_FIELDS)
    .eq("status", "ready")
    .eq("visibility", "public")
    .not("audio_path", "is", null)
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false });

  const playlistsPromise = supabase
    .from("playlists")
    .select(PLAYLIST_CARD_FIELDS)
    .eq("visibility", "public")
    .order("follower_count", { ascending: false })
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false });

  const [{ data: tracks }, { data: playlists }] = await Promise.all([tracksPromise, playlistsPromise]);

  return {
    tracks: (tracks as Track[] | null) ?? [],
    playlists: (playlists as Playlist[] | null) ?? [],
  };
}

async function fetchEngagementState(
  supabase: SupabaseQueryClient,
  { userId, songIds = [], playlistIds = [], artistIds = [] }: EngagementInput,
): Promise<EngagementState> {
  const normalizedSongIds = uniqueValues(songIds);
  const normalizedPlaylistIds = uniqueValues(playlistIds);
  const normalizedArtistIds = uniqueValues(artistIds);

  const likedPromise = normalizedSongIds.length
    ? supabase.from("liked_songs").select("song_id").eq("user_id", userId).in("song_id", normalizedSongIds)
    : Promise.resolve({ data: [] as Array<{ song_id: number }> | null });

  const savedPromise = normalizedPlaylistIds.length
    ? supabase
        .from("saved_playlists")
        .select("playlist_id")
        .eq("user_id", userId)
        .in("playlist_id", normalizedPlaylistIds)
    : Promise.resolve({ data: [] as Array<{ playlist_id: string }> | null });

  const followedPromise = normalizedArtistIds.length
    ? getAdminSupabase()
        .then(async (adminSupabase) => {
          if (adminSupabase) {
            const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

            if (!error) {
              const followedIds = getFollowedArtistIds(data.user).filter((artistId) =>
                normalizedArtistIds.includes(artistId),
              );

              return { data: followedIds.map((artistId) => ({ artist_id: artistId })) };
            }
          }

          const { data } = await supabase.auth.getUser();
          const followedIds = getFollowedArtistIds(data.user).filter((artistId) =>
            normalizedArtistIds.includes(artistId),
          );

          return { data: followedIds.map((artistId) => ({ artist_id: artistId })) };
        })
        .catch(async () => {
          const { data } = await supabase.auth.getUser();
          const followedIds = getFollowedArtistIds(data.user).filter((artistId) =>
            normalizedArtistIds.includes(artistId),
          );

          return { data: followedIds.map((artistId) => ({ artist_id: artistId })) };
        })
    : Promise.resolve({ data: [] as Array<{ artist_id: string }> | null });

  const [{ data: likedRows }, { data: savedRows }, { data: followedRows }] = await Promise.all([
    likedPromise,
    savedPromise,
    followedPromise,
  ]);

  return {
    likedSongIds: ((likedRows as Array<{ song_id: number }> | null) ?? []).map((row) => row.song_id),
    savedPlaylistIds: ((savedRows as Array<{ playlist_id: string }> | null) ?? []).map(
      (row) => row.playlist_id,
    ),
    followedArtistIds: ((followedRows as Array<{ artist_id: string }> | null) ?? []).map(
      (row) => row.artist_id,
    ),
  };
}

async function fetchLibraryData(supabase: SupabaseQueryClient, userId: string): Promise<LibraryData> {
  const ownedPromise = supabase
    .from("playlists")
    .select(PLAYLIST_CARD_FIELDS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  const savedIdsPromise = supabase.from("saved_playlists").select("playlist_id").eq("user_id", userId);

  const [{ data: ownedPlaylists }, { data: savedRows }] = await Promise.all([ownedPromise, savedIdsPromise]);

  const savedIds = ((savedRows as Array<{ playlist_id: string }> | null) ?? []).map(
    (row) => row.playlist_id,
  );

  let savedPlaylists: Playlist[] = [];

  if (savedIds.length > 0) {
    const { data } = await supabase
      .from("playlists")
      .select(PLAYLIST_CARD_FIELDS)
      .in("id", savedIds)
      .order("updated_at", { ascending: false });

    savedPlaylists = (data as Playlist[] | null) ?? [];
  }

  return {
    ownedPlaylists: (ownedPlaylists as Playlist[] | null) ?? [],
    savedPlaylists,
  };
}

async function fetchLikedTracks(supabase: SupabaseQueryClient, userId: string) {
  const { data: likedRows } = await supabase
    .from("liked_songs")
    .select("song_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const songIds = ((likedRows as Array<{ song_id: number }> | null) ?? []).map((row) => row.song_id);

  if (!songIds.length) {
    return [];
  }

  const { data: songs } = await supabase
    .from("songs")
    .select(TRACK_CARD_FIELDS)
    .in("id", songIds)
    .not("audio_path", "is", null);
  const trackMap = new Map<number, Track>(((songs as Track[] | null) ?? []).map((track) => [track.id, track]));

  return songIds.map((id) => trackMap.get(id)).filter(Boolean) as Track[];
}

async function fetchPublicCatalogTracks(supabase: SupabaseQueryClient) {
  const { data } = await supabase
    .from("songs")
    .select(TRACK_CARD_FIELDS)
    .eq("status", "ready")
    .eq("visibility", "public")
    .not("audio_path", "is", null)
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false });

  return (data as Track[] | null) ?? [];
}

async function fetchContributorProfiles(supabase: SupabaseQueryClient, tracks: Track[]) {
  const contributorIds = uniqueValues(tracks.map((track) => track.artist_id).filter(Boolean));

  if (!contributorIds.length) {
    return new Map<string, Profile>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,bio")
    .in("id", contributorIds);

  return new Map<string, Profile>(((data as Profile[] | null) ?? []).map((profile) => [profile.id, profile]));
}

function buildCatalogArtists(tracks: Track[], profileMap: Map<string, Profile>) {
  const artistMap = new Map<
    string,
    CatalogArtist & {
      tracks: Track[];
      contributorIds: Set<string>;
    }
  >();

  for (const track of tracks) {
    const name = track.artist_display?.trim() || "Unknown artist";
    const id = buildArtistId(name);
    const contributor = profileMap.get(track.artist_id);
    const existing = artistMap.get(id);

    if (existing) {
      existing.songs_count += 1;
      existing.total_plays += track.play_count ?? 0;
      existing.latest_release_at =
        !existing.latest_release_at || (track.created_at && track.created_at > existing.latest_release_at)
          ? track.created_at ?? existing.latest_release_at
          : existing.latest_release_at;
      existing.hero_image_url = existing.hero_image_url ?? track.cover_url ?? null;
      existing.avatar_url = existing.avatar_url ?? contributor?.avatar_url ?? track.cover_url ?? null;
      if (!existing.contributor_label && contributor?.display_name) {
        existing.contributor_label = contributor.display_name;
      }
      existing.tracks.push(track);
      existing.contributorIds.add(track.artist_id);
      continue;
    }

    artistMap.set(id, {
      id,
      display_name: name,
      avatar_url: contributor?.avatar_url ?? track.cover_url ?? null,
      hero_image_url: track.cover_url ?? contributor?.avatar_url ?? null,
      bio: contributor?.bio ?? buildCatalogArtistBio(name, 1, contributor?.display_name),
      followers_count: 0,
      songs_count: 1,
      total_plays: track.play_count ?? 0,
      latest_release_at: track.created_at ?? null,
      contributor_label: contributor?.display_name ?? null,
      tracks: [track],
      contributorIds: new Set([track.artist_id]),
    });
  }

  return [...artistMap.values()]
    .map((artist) => ({
      ...artist,
      bio: artist.bio ?? buildCatalogArtistBio(artist.display_name, artist.songs_count, artist.contributor_label),
    }))
    .sort((left, right) => {
      if (right.total_plays !== left.total_plays) {
        return right.total_plays - left.total_plays;
      }

      return (right.latest_release_at ?? "").localeCompare(left.latest_release_at ?? "");
    });
}

async function fetchArtists(supabase: SupabaseQueryClient) {
  const tracks = await fetchPublicCatalogTracks(supabase);
  const profiles = await fetchContributorProfiles(supabase, tracks);

  return buildCatalogArtists(tracks, profiles).slice(0, 24).map((artist) => ({
    id: artist.id,
    display_name: artist.display_name,
    avatar_url: artist.avatar_url,
    hero_image_url: artist.hero_image_url,
    bio: artist.bio,
    followers_count: artist.followers_count,
    songs_count: artist.songs_count,
    total_plays: artist.total_plays,
    latest_release_at: artist.latest_release_at,
    contributor_label: artist.contributor_label,
  }));
}

async function fetchArtistDetail(supabase: SupabaseQueryClient, artistId: string) {
  const tracks = await fetchPublicCatalogTracks(supabase);
  const profiles = await fetchContributorProfiles(supabase, tracks);
  const artists = buildCatalogArtists(tracks, profiles);
  const match = artists.find((artist) => artist.id === artistId);

  if (!match) {
    return { artist: null, tracks: [], albums: [] };
  }

  const albums: Album[] = [];

  return {
    artist: {
      id: match.id,
      display_name: match.display_name,
      avatar_url: match.avatar_url,
      hero_image_url: match.hero_image_url,
      bio: match.bio,
      followers_count: match.followers_count,
      songs_count: match.songs_count,
      total_plays: match.total_plays,
      latest_release_at: match.latest_release_at,
      contributor_label: match.contributor_label,
    },
    tracks: match.tracks,
    albums,
  };
}

async function fetchStudioTracks(supabase: SupabaseQueryClient, userId: string) {
  const { data } = await supabase
    .from("songs")
    .select(TRACK_CARD_FIELDS)
    .eq("artist_id", userId)
    .order("created_at", { ascending: false });

  return (data as Track[] | null) ?? [];
}

async function fetchAddablePlaylistTracks(supabase: SupabaseQueryClient, userId: string) {
  const [{ data: publicTracks }, { data: ownedTracks }] = await Promise.all([
    supabase
      .from("songs")
      .select(TRACK_CARD_FIELDS)
      .eq("status", "ready")
      .eq("visibility", "public")
      .not("audio_path", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("songs")
      .select(TRACK_CARD_FIELDS)
      .eq("artist_id", userId)
      .eq("status", "ready")
      .not("audio_path", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const merged = [...((publicTracks as Track[] | null) ?? []), ...((ownedTracks as Track[] | null) ?? [])];
  const uniqueById = new Map<number, Track>();

  for (const track of merged) {
    uniqueById.set(track.id, track);
  }

  return [...uniqueById.values()];
}

async function fetchStudioPlaylists(supabase: SupabaseQueryClient, userId: string) {
  const { data } = await supabase
    .from("playlists")
    .select(PLAYLIST_CARD_FIELDS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  return (data as Playlist[] | null) ?? [];
}

const getCachedProfileOverview = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchProfileOverview(supabase, userId) : null;
  },
  ["profile-overview"],
  { tags: [DATA_CACHE_TAGS.profile, DATA_CACHE_TAGS.studio, DATA_CACHE_TAGS.library], revalidate: 1800 },
);

const getCachedDiscoverData = unstable_cache(
  async () => {
    const supabase = await getPublicCacheSupabase();
    return supabase ? fetchDiscoverData(supabase) : { tracks: [], playlists: [] };
  },
  ["discover-data"],
  { tags: [DATA_CACHE_TAGS.discover, DATA_CACHE_TAGS.catalog, DATA_CACHE_TAGS.tracks, DATA_CACHE_TAGS.playlists], revalidate: 1800 },
);

const getCachedEngagementState = unstable_cache(
  async (input: EngagementInput) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchEngagementState(supabase, input) : null;
  },
  ["engagement-state"],
  { tags: [DATA_CACHE_TAGS.engagement], revalidate: 300 },
);

const getCachedLibraryData = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchLibraryData(supabase, userId) : null;
  },
  ["library-data"],
  { tags: [DATA_CACHE_TAGS.library, DATA_CACHE_TAGS.playlists], revalidate: 1800 },
);

const getCachedLikedTracks = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchLikedTracks(supabase, userId) : null;
  },
  ["liked-tracks"],
  { tags: [DATA_CACHE_TAGS.liked, DATA_CACHE_TAGS.engagement], revalidate: 1800 },
);

const getCachedArtists = unstable_cache(
  async () => {
    const supabase = await getPublicCacheSupabase();
    return supabase ? fetchArtists(supabase) : [];
  },
  ["artists"],
  { tags: [DATA_CACHE_TAGS.artists, DATA_CACHE_TAGS.profile], revalidate: 1800 },
);

const getCachedArtistDetail = unstable_cache(
  async (artistId: string) => {
    const supabase = await getPublicCacheSupabase();
    return supabase ? fetchArtistDetail(supabase, artistId) : { artist: null, tracks: [], albums: [] };
  },
  ["artist-detail"],
  { tags: [DATA_CACHE_TAGS.artists, DATA_CACHE_TAGS.tracks, DATA_CACHE_TAGS.profile], revalidate: 1800 },
);

const getCachedStudioTracks = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchStudioTracks(supabase, userId) : null;
  },
  ["studio-tracks"],
  { tags: [DATA_CACHE_TAGS.studio, DATA_CACHE_TAGS.tracks], revalidate: 1800 },
);

const getCachedAddablePlaylistTracks = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchAddablePlaylistTracks(supabase, userId) : null;
  },
  ["addable-playlist-tracks"],
  { tags: [DATA_CACHE_TAGS.addableTracks, DATA_CACHE_TAGS.tracks, DATA_CACHE_TAGS.playlists], revalidate: 1800 },
);

const getCachedStudioPlaylists = unstable_cache(
  async (userId: string) => {
    const supabase = await getUserCacheSupabase();
    return supabase ? fetchStudioPlaylists(supabase, userId) : null;
  },
  ["studio-playlists"],
  { tags: [DATA_CACHE_TAGS.studio, DATA_CACHE_TAGS.library, DATA_CACHE_TAGS.playlists], revalidate: 1800 },
);

export const getCurrentUser = cache(async () => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(async () => {
  const supabase = await getServerSupabase();
  const user = await getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

export const getProfileOverview = cache(async (userId: string): Promise<ProfileOverview> => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return {
      profile: null,
      stats: {
        uploadedTracks: 0,
        publicTracks: 0,
        readyTracks: 0,
        totalPlays: 0,
        totalLikes: 0,
        ownedPlaylists: 0,
        publicPlaylists: 0,
        likedSongs: 0,
        savedPlaylists: 0,
        following: 0,
      },
      recentTracks: [],
      recentPlaylists: [],
    };
  }

  return (await getCachedProfileOverview(userId)) ?? fetchProfileOverview(supabase, userId);
});

export const getDiscoverData = cache(async (): Promise<DiscoverData> => {
  return getCachedDiscoverData();
});

export const getEngagementState = cache(async ({
  userId,
  songIds = [],
  playlistIds = [],
  artistIds = [],
}: EngagementInput): Promise<EngagementState> => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return {
      likedSongIds: [],
      savedPlaylistIds: [],
      followedArtistIds: [],
    };
  }

  const normalizedInput = {
    userId,
    songIds: uniqueValues(songIds).toSorted((a, b) => a - b),
    playlistIds: uniqueValues(playlistIds).toSorted(),
    artistIds: uniqueValues(artistIds).toSorted(),
  };

  return (await getCachedEngagementState(normalizedInput)) ?? fetchEngagementState(supabase, normalizedInput);
});

export const getLibraryData = cache(async (userId: string): Promise<LibraryData> => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return { ownedPlaylists: [], savedPlaylists: [] };
  }

  return (await getCachedLibraryData(userId)) ?? fetchLibraryData(supabase, userId);
});

export const getLikedTracks = cache(async (userId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return [];
  }

  return (await getCachedLikedTracks(userId)) ?? fetchLikedTracks(supabase, userId);
});

export const getArtists = cache(async () => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return [];
  }

  return getCachedArtists();
});

export const getArtistDetail = cache(async (artistId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return { artist: null, tracks: [], albums: [] };
  }

  return getCachedArtistDetail(artistId);
});

export const getPlaylistDetail = cache(async (playlistId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return { playlist: null, tracks: [], entries: [] };
  }

  const { data: playlist } = await supabase
    .from("playlists")
    .select(PLAYLIST_CARD_FIELDS)
    .eq("id", playlistId)
    .maybeSingle();

  if (!playlist) {
    return { playlist: null, tracks: [], entries: [] };
  }

  const { data: playlistSongsData } = await supabase
    .from("playlist_songs")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  const playlistSongs = (playlistSongsData as PlaylistTrack[] | null) ?? [];
  const songIds = playlistSongs.map((entry) => entry.song_id);

  let tracks: Track[] = [];
  let entries: PlaylistTrack[] = [];

  if (songIds.length > 0) {
    const { data } = await supabase
      .from("songs")
      .select(TRACK_CARD_FIELDS)
      .in("id", songIds)
      .not("audio_path", "is", null);
    const trackMap = new Map<number, Track>(((data as Track[] | null) ?? []).map((track) => [track.id, track]));
    entries = playlistSongs
      .map((entry) => ({
        ...entry,
        track: trackMap.get(entry.song_id) ?? null,
      }))
      .filter((entry) => Boolean(entry.track)) as PlaylistTrack[];
    tracks = entries.map((entry) => entry.track!).filter(Boolean) as Track[];
  }

  return {
    playlist: playlist as unknown as Playlist,
    tracks,
    entries,
  };
});

export const getStudioTracks = cache(async (userId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return [];
  }

  return (await getCachedStudioTracks(userId)) ?? fetchStudioTracks(supabase, userId);
});

export const getAddablePlaylistTracks = cache(async (userId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return [];
  }

  return (await getCachedAddablePlaylistTracks(userId)) ?? fetchAddablePlaylistTracks(supabase, userId);
});

export const getStudioPlaylists = cache(async (userId: string) => {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return [];
  }

  return (await getCachedStudioPlaylists(userId)) ?? fetchStudioPlaylists(supabase, userId);
});

export const getAdminDashboardData = cache(async (): Promise<AdminDashboardData> => {
  let accessMode: AdminDashboardData["accessMode"] = "service";
  let supabase:
    | Awaited<ReturnType<typeof getAdminSupabase>>
    | Awaited<ReturnType<typeof getServerSupabase>>
    | null = null;

  try {
    supabase = await getAdminSupabase();
  } catch {
    accessMode = "session";
    supabase = await getServerSupabase();
  }

  if (!supabase) {
    return {
      accessMode: "unconfigured",
      stats: {
        users: 0,
        artists: 0,
        tracks: 0,
        readyTracks: 0,
        playlists: 0,
        publicPlaylists: 0,
        plays: 0,
      },
      users: [],
      recentTracks: [],
      recentPlaylists: [],
      topArtists: [],
    };
  }

  const [
    usersResult,
    artistsResult,
    tracksResult,
    readyTracksResult,
    playlistsResult,
    publicPlaylistsResult,
    playsResult,
    adminUsersResult,
    recentTracksResult,
    recentPlaylistsResult,
    topArtistsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_artist", true),
    supabase.from("songs").select("id", { count: "exact", head: true }).not("audio_path", "is", null),
    supabase
      .from("songs")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .not("audio_path", "is", null),
    supabase.from("playlists").select("id", { count: "exact", head: true }),
    supabase.from("playlists").select("id", { count: "exact", head: true }).eq("visibility", "public"),
    supabase.from("songs").select("play_count").not("audio_path", "is", null),
    supabase
      .from("profiles")
      .select(
        "id,email,username,display_name,avatar_url,is_artist,verified_artist,followers_count,following_count,songs_count,public_playlists_count",
      )
      .order("songs_count", { ascending: false })
      .limit(24),
    supabase
      .from("songs")
      .select(`${TRACK_CARD_FIELDS},like_count,created_at`)
      .not("audio_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(18),
    supabase
      .from("playlists")
      .select(`${PLAYLIST_CARD_FIELDS},created_at,updated_at`)
      .order("updated_at", { ascending: false })
      .limit(18),
    supabase
      .from("profiles")
      .select(ARTIST_CARD_FIELDS)
      .eq("is_artist", true)
      .order("followers_count", { ascending: false })
      .limit(5),
  ]);

  const totalPlays = ((playsResult.data as Array<{ play_count: number | null }> | null) ?? []).reduce(
    (sum, row) => sum + (row.play_count ?? 0),
    0,
  );

  return {
    accessMode,
    stats: {
      users: usersResult.count ?? 0,
      artists: artistsResult.count ?? 0,
      tracks: tracksResult.count ?? 0,
      readyTracks: readyTracksResult.count ?? 0,
      playlists: playlistsResult.count ?? 0,
      publicPlaylists: publicPlaylistsResult.count ?? 0,
      plays: totalPlays,
    },
    users: (adminUsersResult.data as Profile[] | null) ?? [],
    recentTracks: (recentTracksResult.data as Track[] | null) ?? [],
    recentPlaylists: (recentPlaylistsResult.data as Playlist[] | null) ?? [],
    topArtists: (topArtistsResult.data as Profile[] | null) ?? [],
  };
});
