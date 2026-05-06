export function evictCachedMedia(urls: Array<string | null | undefined>) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const cleanUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))];

  if (!cleanUrls.length) {
    return;
  }

  const message = {
    type: "BIRVANA_MEDIA_CACHE_EVICT",
    urls: cleanUrls,
  };

  navigator.serviceWorker.controller?.postMessage(message);
  void navigator.serviceWorker
    .getRegistration("/")
    .then((registration) => {
      registration?.active?.postMessage(message);
    })
    .catch(() => undefined);
}

export function notifyTrackDeleted(trackId: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("birvana:track-deleted", {
      detail: { trackId },
    }),
  );
}
