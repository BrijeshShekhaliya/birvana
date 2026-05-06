import { NextResponse } from "next/server";
import { fuzzyMatch } from "@/lib/search";
import { getDiscoverData } from "@/lib/data";

export const dynamic = "force-dynamic";

function clampLimit(value: string | null) {
  return Math.min(30, Math.max(4, Number(value || 12)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = clampLimit(searchParams.get("limit"));
  const { tracks: catalogTracks, playlists: catalogPlaylists } = await getDiscoverData();
  const tracks = catalogTracks.filter((track) => fuzzyMatch(query, track.title, track.artist_display)).slice(0, limit);
  const playlists = catalogPlaylists
    .filter((playlist) => fuzzyMatch(query, playlist.name, playlist.description ?? ""))
    .slice(0, limit);

  return NextResponse.json({
    query,
    tracks,
    playlists,
  });
}
