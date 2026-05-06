import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "@/components/shared/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BIRVANA",
  description: "Modern music streaming with mobile-first listening, playlists, and studio tools.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type ThemeMode = "light" | "dark";
type MotionMode = "full" | "reduced";
type PlayerSizeMode = "compact" | "comfortable";
type ToggleMode = "on" | "off";

const preferenceBootstrapScript = `
(() => {
  try {
    const root = document.documentElement;
    const pathname = window.location.pathname;
    const isPublicThemeRoute = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/verify-email";
    const savedTheme = window.localStorage.getItem("birvana-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = isPublicThemeRoute
      ? (prefersDark ? "dark" : "light")
      : (savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light");
    const motion = window.localStorage.getItem("birvana-motion") === "reduced" ? "reduced" : "full";
    const playerSize = window.localStorage.getItem("birvana-player-size") === "comfortable" ? "comfortable" : "compact";
    const sourceBadges = window.localStorage.getItem("birvana-source-badges") === "off" ? "off" : "on";
    const desktopEffects = window.localStorage.getItem("birvana-desktop-effects") === "off" ? "off" : "on";
    const maxAge = 60 * 60 * 24 * 365;

    root.dataset.theme = theme;
    root.dataset.motion = motion;
    root.dataset.playerSize = playerSize;
    root.dataset.sourceBadges = sourceBadges;
    root.dataset.desktopEffects = desktopEffects;
    document.cookie = "birvana-motion=" + motion + ";path=/;max-age=" + maxAge + ";samesite=lax";
    document.cookie = "birvana-player-size=" + playerSize + ";path=/;max-age=" + maxAge + ";samesite=lax";
    document.cookie = "birvana-source-badges=" + sourceBadges + ";path=/;max-age=" + maxAge + ";samesite=lax";
    document.cookie = "birvana-desktop-effects=" + desktopEffects + ";path=/;max-age=" + maxAge + ";samesite=lax";
    if (!isPublicThemeRoute) {
      document.cookie = "birvana-theme=" + theme + ";path=/;max-age=" + maxAge + ";samesite=lax";
    }
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.motion = "full";
    document.documentElement.dataset.playerSize = "compact";
    document.documentElement.dataset.sourceBadges = "on";
    document.documentElement.dataset.desktopEffects = "on";
  }
})();
`;

function readThemeCookie(value: string | undefined): ThemeMode | undefined {
  return value === "dark" || value === "light" ? value : undefined;
}

function readMotionCookie(value: string | undefined): MotionMode | undefined {
  return value === "reduced" || value === "full" ? value : undefined;
}

function readPlayerSizeCookie(value: string | undefined): PlayerSizeMode | undefined {
  return value === "comfortable" || value === "compact" ? value : undefined;
}

function readToggleCookie(value: string | undefined): ToggleMode | undefined {
  return value === "off" || value === "on" ? value : undefined;
}

function getAudioOrigin() {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const audioOrigin = getAudioOrigin();
  const savedTheme = readThemeCookie(cookieStore.get("birvana-theme")?.value);
  const savedMotion = readMotionCookie(cookieStore.get("birvana-motion")?.value) ?? "full";
  const savedPlayerSize = readPlayerSizeCookie(cookieStore.get("birvana-player-size")?.value) ?? "compact";
  const savedSourceBadges = readToggleCookie(cookieStore.get("birvana-source-badges")?.value) ?? "on";
  const savedDesktopEffects = readToggleCookie(cookieStore.get("birvana-desktop-effects")?.value) ?? "on";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      data-theme={savedTheme}
      data-motion={savedMotion}
      data-player-size={savedPlayerSize}
      data-source-badges={savedSourceBadges}
      data-desktop-effects={savedDesktopEffects}
      suppressHydrationWarning
    >
      <head>
        {audioOrigin ? (
          <>
            <link rel="dns-prefetch" href={audioOrigin} />
            <link rel="preconnect" href={audioOrigin} crossOrigin="" />
          </>
        ) : null}
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <Script
          id="birvana-preference-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: preferenceBootstrapScript }}
        />
      </body>
    </html>
  );
}
