"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { MediaCacheProvider } from "@/components/shared/MediaCacheProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MediaCacheProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </MediaCacheProvider>
    </AuthProvider>
  );
}
