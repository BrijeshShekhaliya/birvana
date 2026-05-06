import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getObjectFromR2, keyFromUrl } from "@/lib/r2/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toWebStream(body: unknown) {
  if (!body) {
    throw new Error("Missing stream body");
  }

  if (body instanceof ReadableStream) {
    return body;
  }

  if (typeof body === "object" && body !== null && "transformToWebStream" in body) {
    const transformable = body as { transformToWebStream: () => ReadableStream<Uint8Array> };
    return transformable.transformToWebStream();
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  throw new Error("Unsupported stream body");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing audio URL" }, { status: 400 });
    }

    const key = keyFromUrl(targetUrl);

    if (!key) {
      return NextResponse.json({ error: "Invalid audio source" }, { status: 400 });
    }

    const range = request.headers.get("range") || undefined;
    const response = await getObjectFromR2(key, range);

    if (!response.Body) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Type", response.ContentType || "audio/mpeg");
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");

    if (response.ContentLength !== undefined) {
      headers.set("Content-Length", String(response.ContentLength));
    }

    if (response.ContentRange) {
      headers.set("Content-Range", response.ContentRange);
    }

    if (response.ETag) {
      headers.set("ETag", response.ETag);
    }

    if (response.LastModified) {
      headers.set("Last-Modified", response.LastModified.toUTCString());
    }

    return new NextResponse(toWebStream(response.Body), {
      status: response.ContentRange || range ? 206 : 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to stream song" },
      { status: 500 },
    );
  }
}
