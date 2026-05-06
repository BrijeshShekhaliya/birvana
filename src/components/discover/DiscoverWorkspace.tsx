"use client";

import { Search, X } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import styles from "./DiscoverWorkspace.module.css";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlaylistCard } from "@/components/shared/PlaylistCard";
import { TrackCard } from "@/components/shared/TrackCard";
import { resolveTrackCategory, type MusicCategory } from "@/lib/music/categories";
import { searchPlaylists, searchTracks } from "@/lib/search";
import type { Playlist, Track } from "@/types/models";

type DiscoverCategory =
  | "all"
  | MusicCategory;
type DiscoverTrackCategory = Exclude<DiscoverCategory, "all">;
type DiscoverCategoryOption = {
  id: DiscoverCategory;
  label: string;
  eyebrow: string;
  description: string;
  accent: string;
};

const shelfLimit = 12;

const browseCategories: DiscoverCategoryOption[] = [
  {
    id: "all",
    label: "All songs",
    eyebrow: "Full catalog",
    description: "Every public track in one place.",
    accent: "Everything",
  },
  {
    id: "hindi",
    label: "Hindi",
    eyebrow: "Film and pop",
    description: "Bollywood hooks, romantic cuts, and chart staples.",
    accent: "Bollywood",
  },
  {
    id: "punjabi",
    label: "Punjabi",
    eyebrow: "High energy",
    description: "Bhangra pressure, rap edges, and fast hooks.",
    accent: "Bhangra",
  },
  {
    id: "english",
    label: "English",
    eyebrow: "Global picks",
    description: "Mainstream pop, alt favorites, and crossover singles.",
    accent: "Global",
  },
  {
    id: "south",
    label: "Tamil & South",
    eyebrow: "Regional favorites",
    description: "Tamil, Telugu, Malayalam, and South-led standouts.",
    accent: "South",
  },
  {
    id: "devotional",
    label: "Devotional",
    eyebrow: "Reflective sets",
    description: "Bhajans, aartis, and spiritual listening sessions.",
    accent: "Bhakti",
  },
  {
    id: "other",
    label: "Other",
    eyebrow: "Outside the main lanes",
    description: "Indie uploads, experiments, and everything uncategorized.",
    accent: "Indie",
  },
];

const categoryThemeClassNames: Record<DiscoverCategory, string> = {
  all: styles.categoryArtAll,
  hindi: styles.categoryArtHindi,
  punjabi: styles.categoryArtPunjabi,
  english: styles.categoryArtEnglish,
  south: styles.categoryArtSouth,
  devotional: styles.categoryArtDevotional,
  other: styles.categoryArtOther,
};

function getCreatedTime(track: Track) {
  if (!track.created_at) {
    return 0;
  }

  const time = Date.parse(track.created_at);
  return Number.isNaN(time) ? 0 : time;
}

function getCategoryLabel(categoryId: DiscoverCategory) {
  return browseCategories.find((category) => category.id === categoryId)?.label ?? "Songs";
}

function TrackShelf({
  title,
  meta,
  tracks,
  queueKey,
  likedSet,
  canEngage,
  actionLabel,
  onAction,
}: {
  title: string;
  meta: string;
  tracks: Track[];
  queueKey: string;
  likedSet: Set<number>;
  canEngage: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!tracks.length) {
    return null;
  }

  return (
    <section className={styles.shelf}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionMeta}>{meta}</p>
        </div>
        {actionLabel && onAction ? (
          <button type="button" className={styles.textButton} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className={styles.railViewport}>
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            tracks={tracks}
            index={index}
            queueKey={queueKey}
            variant="discover"
            initialLiked={likedSet.has(track.id)}
            showLikeButton={canEngage}
          />
        ))}
      </div>
    </section>
  );
}

function PlaylistShelf({
  title,
  playlists,
  savedSet,
  canEngage,
  currentUserId,
}: {
  title: string;
  playlists: Playlist[];
  savedSet: Set<string>;
  canEngage: boolean;
  currentUserId?: string;
}) {
  if (!playlists.length) {
    return null;
  }

  return (
    <section className={styles.shelf}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionMeta}>{playlists.length} public collections</p>
        </div>
      </div>

      <div className={`${styles.railViewport} ${styles.playlistRailViewport}`}>
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            size="discover"
            initialSaved={savedSet.has(playlist.id)}
            showSaveButton={canEngage && playlist.owner_id !== currentUserId}
          />
        ))}
      </div>
    </section>
  );
}

export function DiscoverWorkspace({
  tracks,
  playlists,
  likedSongIds,
  savedPlaylistIds,
  canEngage,
  currentUserId,
}: {
  tracks: Track[];
  playlists: Playlist[];
  likedSongIds: number[];
  savedPlaylistIds: string[];
  canEngage: boolean;
  currentUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<DiscoverCategory>("all");
  const deferredQuery = useDeferredValue(query);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToDetailRef = useRef(false);
  const likedSet = useMemo(() => new Set(likedSongIds), [likedSongIds]);
  const savedSet = useMemo(() => new Set(savedPlaylistIds), [savedPlaylistIds]);
  const normalizedQuery = deferredQuery.trim();
  const searching = normalizedQuery.length > 0;

  const tracksByCategory = useMemo(() => {
    return tracks.reduce<Record<DiscoverTrackCategory, Track[]>>(
      (grouped, track) => {
        const category = resolveTrackCategory(track);
        grouped[category].push(track);
        return grouped;
      },
      {
        hindi: [],
        english: [],
        south: [],
        punjabi: [],
        devotional: [],
        other: [],
      },
    );
  }, [tracks]);

  const categorySummaries = useMemo(() => {
    return browseCategories.map((category) => {
      const categoryTracks = category.id === "all" ? tracks : tracksByCategory[category.id];
      return {
        ...category,
        count: categoryTracks.length,
      };
    });
  }, [tracks, tracksByCategory]);

  const selectedCategoryTracks = useMemo(() => {
    if (activeCategory === "all") {
      return tracks;
    }

    return tracksByCategory[activeCategory];
  }, [activeCategory, tracks, tracksByCategory]);

  const topTracks = useMemo(() => tracks.slice(0, shelfLimit), [tracks]);
  const newTracks = useMemo(
    () => [...tracks].sort((a, b) => getCreatedTime(b) - getCreatedTime(a)).slice(0, shelfLimit),
    [tracks],
  );

  const categoryShelves = useMemo(() => {
    return browseCategories
      .filter(
        (
          category,
        ): category is DiscoverCategoryOption & { id: DiscoverTrackCategory } => category.id !== "all",
      )
      .map((category) => ({
        ...category,
        tracks: tracksByCategory[category.id],
      }))
      .filter((category) => category.tracks.length > 0);
  }, [tracksByCategory]);

  const filteredTracks = useMemo(
    () => (searching ? searchTracks(tracks, normalizedQuery) : selectedCategoryTracks),
    [normalizedQuery, searching, selectedCategoryTracks, tracks],
  );

  const filteredPlaylists = useMemo(
    () => (searching ? searchPlaylists(playlists, normalizedQuery) : playlists),
    [normalizedQuery, playlists, searching],
  );

  const selectCategory = (categoryId: DiscoverCategory) => {
    shouldScrollToDetailRef.current = true;
    startTransition(() => {
      setQuery("");
      setActiveCategory(categoryId);
    });
  };

  useEffect(() => {
    if (!shouldScrollToDetailRef.current || searching) {
      return;
    }

    shouldScrollToDetailRef.current = false;
    detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCategory, searching]);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Discover music">
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>Discover</h1>
          <p className={styles.heroText}>
            Find songs, move through sharper categories, and keep your listening flow intact.
          </p>
        </div>

        <label className={styles.searchField}>
          <Search size={17} strokeWidth={2.15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs or playlists"
            aria-label="Search songs or playlists"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} strokeWidth={2.2} />
            </button>
          ) : null}
        </label>
      </section>

      <section className={styles.categoryDeck} aria-label="Browse by category">
        {categorySummaries.map((category) => {
          const active = activeCategory === category.id && !searching;
          return (
            <button
              key={category.id}
              type="button"
              className={`${styles.categoryCard} ${active ? styles.categoryCardActive : ""}`}
              onClick={() => selectCategory(category.id)}
            >
              <span className={`${styles.categoryArt} ${categoryThemeClassNames[category.id]}`} aria-hidden="true">
                <span className={styles.categoryEyebrow}>{category.eyebrow}</span>
                <span className={styles.categoryAccent}>{category.accent}</span>
              </span>
              <span className={styles.categoryBody}>
                <span className={styles.categoryTitle}>{category.label}</span>
                <span className={styles.categoryDescription}>{category.description}</span>
                <span className={styles.categoryMeta}>{category.count} songs available</span>
              </span>
            </button>
          );
        })}
      </section>

      {searching ? (
        <section ref={detailSectionRef} className={styles.searchResults} aria-label="Search results">
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Search results</h2>
              <p className={styles.sectionMeta}>
                {`${filteredTracks.length + filteredPlaylists.length} matches for "${normalizedQuery}"`}
              </p>
            </div>
            <button type="button" className={styles.textButton} onClick={() => setQuery("")}>
              Clear
            </button>
          </div>

          {filteredTracks.length ? (
            <TrackShelf
              title="Songs"
              meta={`${filteredTracks.length} matches`}
              tracks={filteredTracks}
              queueKey={`discover-search:${normalizedQuery}`}
              likedSet={likedSet}
              canEngage={canEngage}
            />
          ) : null}

          {filteredPlaylists.length ? (
            <PlaylistShelf
              title="Playlists"
              playlists={filteredPlaylists}
              savedSet={savedSet}
              canEngage={canEngage}
              currentUserId={currentUserId}
            />
          ) : null}

          {!filteredTracks.length && !filteredPlaylists.length ? (
            <EmptyState
              title="No matches found"
              description="Try a shorter title, artist name, playlist name, or another spelling."
            />
          ) : null}
        </section>
      ) : activeCategory !== "all" ? (
        <div ref={detailSectionRef}>
          <TrackShelf
            title={`${getCategoryLabel(activeCategory)} songs`}
            meta={`${selectedCategoryTracks.length} available tracks`}
            tracks={selectedCategoryTracks}
            queueKey={`discover-category:${activeCategory}`}
            likedSet={likedSet}
            canEngage={canEngage}
            actionLabel="All songs"
            onAction={() => selectCategory("all")}
          />
        </div>
      ) : (
        <>
          <TrackShelf
            title="Top songs"
            meta={`${topTracks.length} most played tracks`}
            tracks={topTracks}
            queueKey="discover-top-songs"
            likedSet={likedSet}
            canEngage={canEngage}
          />

          <TrackShelf
            title="New releases"
            meta={`${newTracks.length} latest uploads`}
            tracks={newTracks}
            queueKey="discover-new-releases"
            likedSet={likedSet}
            canEngage={canEngage}
          />

          <PlaylistShelf
            title="Public playlists"
            playlists={filteredPlaylists}
            savedSet={savedSet}
            canEngage={canEngage}
            currentUserId={currentUserId}
          />

          <section ref={detailSectionRef} className={styles.categoryShelves} aria-label="Songs by category">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Browse by sound</h2>
                <p className={styles.sectionMeta}>Every public track grouped into its best match.</p>
              </div>
            </div>

            {categoryShelves.map((category) => (
              <TrackShelf
                key={category.id}
                title={category.label}
                meta={`${category.tracks.length} songs`}
                tracks={category.tracks.slice(0, shelfLimit)}
                queueKey={`discover-shelf:${category.id}`}
                likedSet={likedSet}
                canEngage={canEngage}
                actionLabel={category.tracks.length > shelfLimit ? "View all" : undefined}
                onAction={
                  category.tracks.length > shelfLimit ? () => selectCategory(category.id) : undefined
                }
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
