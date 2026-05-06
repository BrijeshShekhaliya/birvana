import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getWritableSupabase() {
  try {
    return await getAdminSupabase();
  } catch {
    return getServerSupabase();
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    event?: string;
    trackId?: number;
  };

  if (payload.event !== "play_started" || !Number.isInteger(payload.trackId)) {
    return NextResponse.json({ error: "Invalid playback event." }, { status: 400 });
  }

  const supabase = await getWritableSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  const { data: track, error: readError } = await supabase
    .from("songs")
    .select("id,play_count,audio_path,status")
    .eq("id", payload.trackId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  if (!track?.id || track.status !== "ready" || !track.audio_path) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  const { error } = await supabase
    .from("songs")
    .update({ play_count: (track.play_count ?? 0) + 1 })
    .eq("id", track.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tracked: true });
}
