const MEDIA_CACHE = "birvana-media-v3";
const MAX_MEDIA_ENTRIES = 260;
const FALLBACK_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Cover unavailable">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#171a1f"/>
      <stop offset="100%" stop-color="#08090b"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#d7a466"/>
      <stop offset="100%" stop-color="#a8643f"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="38" fill="url(#bg)"/>
  <circle cx="160" cy="160" r="74" fill="rgba(255,255,255,0.06)"/>
  <path d="M133 105v92.5a23.5 23.5 0 1 0 14 21.5v-68l68-16v47.5a23.5 23.5 0 1 0 14 21.5v-116l-96 22.5Z" fill="url(#mark)"/>
</svg>`;

function isCoverRequest(request) {
  if (request.method !== "GET" || request.destination !== "image") {
    return false;
  }

  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname).toLowerCase();

  return path.includes("/covers/") || path.includes("covers/");
}

async function trimMediaCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - MAX_MEDIA_ENTRIES;

  if (overflow <= 0) {
    return;
  }

  await Promise.all(keys.slice(0, overflow).map((request) => cache.delete(request)));
}

function createFallbackImageResponse() {
  return new Response(FALLBACK_IMAGE_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("birvana-media-") && key !== MEDIA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!isCoverRequest(request)) {
    return;
  }

  event.respondWith(
    caches.open(MEDIA_CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreVary: true });

      if (cached) {
        return cached;
      }

      let response;

      try {
        response = await fetch(request);
      } catch {
        return createFallbackImageResponse();
      }

      if (response.ok || response.type === "opaque") {
        event.waitUntil(
          cache
            .put(request, response.clone())
            .then(() => trimMediaCache(cache))
            .catch(() => undefined),
        );
      }

      return response;
    }).catch(() => createFallbackImageResponse()),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || message.type !== "BIRVANA_MEDIA_CACHE_EVICT") {
    return;
  }

  const urls = Array.isArray(message.urls) ? message.urls.filter(Boolean) : [];

  event.waitUntil(
    caches.open(MEDIA_CACHE).then(async (cache) => {
      if (!urls.length) {
        return;
      }

      const keys = await cache.keys();
      const targetUrls = new Set(urls);
      await Promise.all(
        keys
          .filter((request) => targetUrls.has(request.url))
          .map((request) => cache.delete(request)),
      );
    }),
  );
});
