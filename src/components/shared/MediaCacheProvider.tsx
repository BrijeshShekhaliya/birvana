"use client";

import { useEffect, type ReactNode } from "react";

export function MediaCacheProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }

    const registerMediaCache = () => {
      navigator.serviceWorker
        .register("/birvana-media-cache.js", { scope: "/" })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") {
      registerMediaCache();
      return;
    }

    window.addEventListener("load", registerMediaCache, { once: true });

    return () => {
      window.removeEventListener("load", registerMediaCache);
    };
  }, []);

  return children;
}
