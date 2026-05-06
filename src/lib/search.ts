import type { Playlist, Track } from "@/types/models";

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubsequence(query: string, value: string) {
  if (!query) {
    return true;
  }

  let queryIndex = 0;

  for (const char of value) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return false;
}

export function fuzzyMatch(query: string, ...values: string[]) {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return true;
  }

  const queryTokens = normalizedQuery.split(" ");

  return values.some((value) => {
    const normalizedValue = normalizeSearch(value);
    if (!normalizedValue) {
      return false;
    }

    if (normalizedValue.includes(normalizedQuery)) {
      return true;
    }

    if (queryTokens.every((token) => normalizedValue.includes(token))) {
      return true;
    }

    return isSubsequence(normalizedQuery.replace(/\s+/g, ""), normalizedValue.replace(/\s+/g, ""));
  });
}

export function searchTracks(tracks: Track[], query: string) {
  return tracks.filter((track) => fuzzyMatch(query, track.title, track.artist_display));
}

export function searchPlaylists(playlists: Playlist[], query: string) {
  return playlists.filter((playlist) => fuzzyMatch(query, playlist.name, playlist.description ?? ""));
}
