import { NextResponse } from "next/server";
import { fuzzyMatch } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Playlist, Track } from "@/types/models";

export const dynamic = "force-dynamic";

const TRACK_FIELDS = [
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
].join(",");

const PLAYLIST_FIELDS = [
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

function clampLimit(value: string | null) {
  return Math.min(30, Math.max(4, Number(value || 12)));
}

export async function GET(request: Request) {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ tracks: [], playlists: [] });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = clampLimit(searchParams.get("limit"));

  const [tracksResult, playlistsResult] = await Promise.all([
    supabase
      .from("songs")
      .select(TRACK_FIELDS)
      .eq("status", "ready")
      .eq("visibility", "public")
      .not("audio_path", "is", null)
      .order("play_count", { ascending: false })
      .limit(Math.max(limit * 3, 24)),
    supabase
      .from("playlists")
      .select(PLAYLIST_FIELDS)
      .eq("visibility", "public")
      .order("follower_count", { ascending: false })
      .limit(Math.max(limit * 3, 24)),
  ]);

  const tracks = ((tracksResult.data as Track[] | null) ?? [])
    .filter((track) => fuzzyMatch(query, track.title, track.artist_display))
    .slice(0, limit);
  const playlists = ((playlistsResult.data as Playlist[] | null) ?? [])
    .filter((playlist) => fuzzyMatch(query, playlist.name, playlist.description ?? ""))
    .slice(0, limit);

  return NextResponse.json({
    query,
    tracks,
    playlists,
  });
}
