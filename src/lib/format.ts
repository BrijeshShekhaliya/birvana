export function formatDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function compactNumber(value?: number | null) {
  const count = value ?? 0;

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }

  return String(count);
}

export function makeShareUrl(shareToken?: string | null) {
  if (!shareToken) {
    return "";
  }

  return `/playlist/share/${shareToken}`;
}
