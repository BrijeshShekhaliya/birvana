"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Clock3, Compass, Heart, Library, LogOut, Settings, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AppShell.module.css";
import { PlayerBar } from "@/components/player/PlayerBar";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/discover", label: "Discover", icon: Compass, match: "/discover" },
  { href: "/library", label: "Library", icon: Library, match: "/library" },
  { href: "/liked", label: "Liked", icon: Heart, match: "/liked" },
  { href: "/history", label: "History", icon: Clock3, match: "/history", showInMobile: false },
  { href: "/artists", label: "Artists", icon: Users, match: "/artists", showInMobile: false },
  { href: "/studio/upload", label: "Studio", icon: SlidersHorizontal, match: "/studio", showInMobile: false },
  { href: "/settings", label: "Settings", icon: Settings, match: "/settings" },
  { href: "/profile", label: "Profile", icon: UserRound, match: "/profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const bottomNavItems = navItems.filter((item) => item.showInMobile !== false);
  const bottomNavStyle = { "--bottom-nav-count": String(bottomNavItems.length) } as CSSProperties;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("birvana-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light";
    const savedMotion = window.localStorage.getItem("birvana-motion");
    const savedPlayerSize = window.localStorage.getItem("birvana-player-size");
    const savedSourceBadges = window.localStorage.getItem("birvana-source-badges");
    const savedDesktopEffects = window.localStorage.getItem("birvana-desktop-effects");

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.motion = savedMotion === "reduced" ? "reduced" : "full";
    document.documentElement.dataset.playerSize = savedPlayerSize === "comfortable" ? "comfortable" : "compact";
    document.documentElement.dataset.sourceBadges = savedSourceBadges === "off" ? "off" : "on";
    document.documentElement.dataset.desktopEffects = savedDesktopEffects === "off" ? "off" : "on";
  }, []);

  useEffect(() => {
    for (const item of navItems) {
      if (pathname.startsWith(item.match)) {
        continue;
      }

      router.prefetch(item.href);
    }
  }, [pathname, router]);

  const signOut = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <ToastProvider>
      <div className={styles.viewport}>
        <aside className={styles.sidebar}>
          <Link href="/discover" className={styles.brand}>
            <span className={styles.brandMark}>B</span>
            <span>BIRVANA</span>
          </Link>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.match);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`${styles.navLink} ${active ? styles.active : ""}`}
                >
                  <Icon size={18} strokeWidth={1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <Link href="/profile" className={styles.userPanel}>
              <p className={styles.userEyebrow}>Signed in as</p>
              <p className={styles.userLabel}>{user?.email ?? "Listener"}</p>
            </Link>
            <button type="button" className={styles.signOut} onClick={signOut}>
              <LogOut size={16} strokeWidth={1.9} />
              Sign out
            </button>
          </div>
        </aside>

        <div className={styles.mainArea}>
          <header className={styles.mobileHeader}>
            <Link href="/discover" className={styles.mobileBrand}>
              <span className={styles.brandMark}>B</span>
              <span>BIRVANA</span>
            </Link>
            <button type="button" className={styles.headerAction} onClick={signOut}>
              Logout
            </button>
          </header>

          <main className={styles.content}>{children}</main>

          <nav className={styles.bottomNav} style={bottomNavStyle}>
            {bottomNavItems.map((item) => {
              const active = pathname.startsWith(item.match);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`${styles.bottomLink} ${active ? styles.bottomActive : ""}`}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <PlayerBar />
      </div>
    </ToastProvider>
  );
}
