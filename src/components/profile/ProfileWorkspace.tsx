import Link from "next/link";
import { CalendarDays, ChevronRight, Disc3, Gauge, Music2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { LazyImage } from "@/components/shared/LazyImage";
import { compactNumber } from "@/lib/format";
import type { ProfileOverview } from "@/types/models";
import styles from "./ProfileWorkspace.module.css";

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
}

export function ProfileWorkspace({ overview, email }: { overview: ProfileOverview; email: string }) {
  const { profile, stats } = overview;

  if (!profile) {
    return (
      <section className={styles.empty}>
        <h1>Profile not found</h1>
        <p>Your account exists, but the profile row is missing.</p>
      </section>
    );
  }

  const identity = profile.username ? `@${profile.username}` : email;
  const totalActivity = stats.uploadedTracks + stats.ownedPlaylists + stats.likedSongs + stats.savedPlaylists;
  const displayNameNeedsReview = profile.display_name.includes(",") && !profile.username;
  const displayName = displayNameNeedsReview ? "Your Birvana profile" : profile.display_name;
  const accountType = profile.verified_artist ? "Verified artist" : profile.is_artist ? "Artist account" : "Listener";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.identityBlock}>
          <div className={styles.avatarFrame}>
            {profile.avatar_url ? (
              <LazyImage src={profile.avatar_url} alt={displayName} className={styles.avatar} eager />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Profile</p>
            <h1>{displayName}</h1>
            <p>{identity}</p>
            {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
            <div className={styles.badges}>
              <span>
                <ShieldCheck size={15} strokeWidth={2} />
                {accountType}
              </span>
              <span>
                <CalendarDays size={15} strokeWidth={2} />
                Joined {formatDate(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.heroActions}>
          <Link href="/studio/upload" className={styles.primaryAction}>
            <UploadCloud size={17} strokeWidth={2} />
            Studio
          </Link>
          <ProfileEditModal profile={profile} triggerClassName={styles.secondaryAction} />
        </div>
      </section>

      {displayNameNeedsReview ? (
        <section className={styles.notice}>
          <Sparkles size={18} strokeWidth={2} />
          <div>
            <strong>Profile name needs review</strong>
            <p>Your display name looks like song artist metadata. Update it below so the account looks correct.</p>
          </div>
        </section>
      ) : null}

      <section className={styles.statsStrip} aria-label="Profile stats">
        <div className={styles.statItem}>
          <span>Tracks uploaded</span>
          <strong>{compactNumber(stats.uploadedTracks)}</strong>
          <small>{compactNumber(stats.publicTracks)} public</small>
        </div>
        <div className={styles.statItem}>
          <span>Total plays</span>
          <strong>{compactNumber(stats.totalPlays)}</strong>
          <small>{compactNumber(stats.totalLikes)} likes on uploads</small>
        </div>
        <div className={styles.statItem}>
          <span>Playlists</span>
          <strong>{compactNumber(stats.ownedPlaylists)}</strong>
          <small>{compactNumber(stats.publicPlaylists)} public</small>
        </div>
        <div className={styles.statItem}>
          <span>Library</span>
          <strong>{compactNumber(totalActivity)}</strong>
          <small>{compactNumber(stats.likedSongs)} liked, {compactNumber(stats.savedPlaylists)} saved</small>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.studioPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Studio</p>
              <h2>Creator workspace</h2>
            </div>
          </div>

          <Link href="/studio/upload" className={styles.studioBanner}>
            <Gauge size={20} strokeWidth={2} />
            <span>
              <strong>Open Studio</strong>
              <small>Upload music, manage covers, and organize your public catalog.</small>
            </span>
            <ChevronRight size={18} strokeWidth={2.2} />
          </Link>

          <div className={styles.quickLinks}>
            <Link href="/studio/tracks">
              <Music2 size={18} strokeWidth={2} />
              <span>Track manager</span>
              <small>{compactNumber(stats.readyTracks)} ready tracks</small>
            </Link>
            <Link href="/studio/playlists">
              <Disc3 size={18} strokeWidth={2} />
              <span>Playlist studio</span>
              <small>{compactNumber(stats.publicPlaylists)} public collections</small>
            </Link>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.accountPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Account</p>
              <h2>Profile details</h2>
            </div>
          </div>

          <div className={styles.detailList}>
            <div className={styles.detailItem}>
              <span>Display name</span>
              <strong>{displayName}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>Identity</span>
              <strong>{identity}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>Account type</span>
              <strong>{accountType}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>Joined</span>
              <strong>{formatDate(profile.created_at)}</strong>
            </div>
            <div className={styles.detailItemWide}>
              <span>Bio</span>
              <strong>{profile.bio || "No bio added yet."}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
