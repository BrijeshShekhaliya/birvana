import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, Library, ShieldCheck, Sparkles, Users } from "lucide-react";
import { CreatorAccessRequestCard } from "@/components/profile/CreatorAccessRequestCard";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { LazyImage } from "@/components/shared/LazyImage";
import { compactNumber } from "@/lib/format";
import type { CreatorAccessState, ProfileOverview } from "@/types/models";
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

function getAccountType(creatorAccess: CreatorAccessState) {
  if (creatorAccess.isApproved) {
    return "Creator access approved";
  }

  if (creatorAccess.isPending) {
    return "Creator request pending";
  }

  return "Listener account";
}

export function ProfileWorkspace({
  overview,
  email,
  creatorAccess,
  followedArtistCount,
}: {
  overview: ProfileOverview;
  email: string;
  creatorAccess: CreatorAccessState;
  followedArtistCount: number;
}) {
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
  const displayNameNeedsReview = profile.display_name.includes(",") && !profile.username;
  const displayName = displayNameNeedsReview ? "Your Birvana profile" : profile.display_name;
  const totalActivity = stats.ownedPlaylists + stats.likedSongs + stats.savedPlaylists + followedArtistCount;
  const accountType = getAccountType(creatorAccess);
  const creatorActionLabel = creatorAccess.hasRequest ? "View Studio status" : "Request creator access";

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
          <Link href="/studio" className={styles.primaryAction}>
            {creatorActionLabel}
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <ProfileEditModal profile={profile} triggerClassName={styles.secondaryAction} />
        </div>
      </section>

      {displayNameNeedsReview ? (
        <section className={styles.notice}>
          <Sparkles size={18} strokeWidth={2} />
          <div>
            <strong>Profile name needs review</strong>
            <p>Your display name looks like imported artist metadata. Update it so the listener profile reads clearly.</p>
          </div>
        </section>
      ) : null}

      <section className={styles.statsStrip} aria-label="Profile stats">
        <div className={styles.statItem}>
          <span>Followed artists</span>
          <strong>{compactNumber(followedArtistCount)}</strong>
          <small>Artists you keep close</small>
        </div>
        <div className={styles.statItem}>
          <span>Liked songs</span>
          <strong>{compactNumber(stats.likedSongs)}</strong>
          <small>Saved for fast replay</small>
        </div>
        <div className={styles.statItem}>
          <span>Playlists</span>
          <strong>{compactNumber(stats.ownedPlaylists)}</strong>
          <small>{compactNumber(stats.publicPlaylists)} public</small>
        </div>
        <div className={styles.statItem}>
          <span>Library</span>
          <strong>{compactNumber(totalActivity)}</strong>
          <small>{compactNumber(stats.savedPlaylists)} saved playlists</small>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.accessPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Studio</p>
              <h2>Creator access</h2>
            </div>
          </div>

          <CreatorAccessRequestCard
            email={email}
            initialRequest={creatorAccess.request}
            title="Apply to open Studio"
            description="Studio is not open by default. Send your details once and BIRVANA will review whether the profile should get creator tools."
          />
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
              <span>Email</span>
              <strong>{email}</strong>
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

          <div className={styles.quickLinks}>
            <Link href="/artists">
              <Users size={18} strokeWidth={2} />
              <span>Artists you follow</span>
              <small>{compactNumber(followedArtistCount)} saved in your listening graph</small>
            </Link>
            <Link href="/liked">
              <Heart size={18} strokeWidth={2} />
              <span>Liked songs</span>
              <small>{compactNumber(stats.likedSongs)} tracks ready to replay</small>
            </Link>
            <Link href="/library">
              <Library size={18} strokeWidth={2} />
              <span>Playlist library</span>
              <small>{compactNumber(stats.ownedPlaylists)} playlists from this account</small>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
