import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { DATA_CACHE_TAGS } from "@/lib/cache-tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tagValues = Object.values(DATA_CACHE_TAGS);
const pathValues = [
  "/",
  "/discover",
  "/library",
  "/liked",
  "/artists",
  "/profile",
  "/studio/tracks",
  "/studio/playlists",
];

function isAuthorized(request: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const provided = request.headers.get("x-birvana-revalidate-token");
  return Boolean(secret && provided && provided === secret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    paths?: string[];
    tags?: string[];
  };

  const paths = [...new Set([...(payload.paths ?? []), ...pathValues].filter(Boolean))];
  const tags = [...new Set([...(payload.tags ?? []), ...tagValues].filter(Boolean))];

  for (const path of paths) {
    revalidatePath(path);
  }

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({
    ok: true,
    revalidatedPaths: paths.length,
    revalidatedTags: tags.length,
  });
}
