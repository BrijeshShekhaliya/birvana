"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LibraryCollectionsPanel.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlaylistCard } from "@/components/shared/PlaylistCard";
import type { Playlist } from "@/types/models";

type LibraryCollectionsPanelProps = {
  ownedPlaylists: Playlist[];
  savedPlaylists: Playlist[];
  currentUserId: string;
};

type TabKey = "created" | "saved";

export function LibraryCollectionsPanel({
  ownedPlaylists,
  savedPlaylists,
  currentUserId,
}: LibraryCollectionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("created");
  const isCreatedTab = activeTab === "created";
  const activePlaylists = isCreatedTab ? ownedPlaylists : savedPlaylists;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Library collections</p>
          <h2 className={styles.title}>
            {isCreatedTab ? "Playlists you manage" : "Playlists you saved"}
          </h2>
          <p className={styles.description}>
            {isCreatedTab
              ? "Your own mixes stay front and center here, ready to open, edit, and grow."
              : "The collections you follow stay in one place so you can jump back in fast."}
          </p>
        </div>

        <div className={styles.headerSide}>
          <div className={styles.toggle} role="tablist" aria-label="Library playlist sections">
            <button
              type="button"
              role="tab"
              aria-selected={isCreatedTab}
              className={`${styles.toggleButton} ${isCreatedTab ? styles.toggleButtonActive : ""}`}
              onClick={() => setActiveTab("created")}
            >
              <span>Created</span>
              <span className={styles.toggleCount}>{ownedPlaylists.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isCreatedTab}
              className={`${styles.toggleButton} ${!isCreatedTab ? styles.toggleButtonActive : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              <span>Saved</span>
              <span className={styles.toggleCount}>{savedPlaylists.length}</span>
            </button>
          </div>

          {isCreatedTab ? (
            <Link href="/studio/playlists" className={styles.action}>
              Create playlist
            </Link>
          ) : null}
        </div>
      </div>

      {activePlaylists.length ? (
        <div className={styles.grid}>
          {activePlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              size="library"
              initialSaved={!isCreatedTab}
              showSaveButton={!isCreatedTab && playlist.owner_id !== currentUserId}
            />
          ))}
        </div>
      ) : isCreatedTab ? (
        <EmptyState
          title="No playlists created"
          description="Create a playlist in Studio and it will show up here in your library."
          actionLabel="Create playlist"
          actionHref="/studio/playlists"
        />
      ) : (
        <EmptyState
          title="Nothing saved yet"
          description="Save a playlist from Discover or an artist page to build your library."
          actionLabel="Browse discover"
          actionHref="/discover"
        />
      )}
    </section>
  );
}
