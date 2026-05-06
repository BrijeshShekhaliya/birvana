"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveTrackCategory } from "@/lib/music/categories";
import type { Track } from "@/types/models";

export type PlaybackHistoryItem = {
  track: Track;
  queue: Track[];
  queueKey: string | null;
  queueContext: QueueContext | null;
  index: number;
  progress: number;
  duration: number;
  updatedAt: number;
};

export type QueueContext = {
  kind: "artist" | "collection" | "discover" | "history" | "library" | "liked" | "playlist";
  label: string;
  href?: string;
};

type PlayerContextValue = {
  queue: Track[];
  queueKey: string | null;
  queueContext: QueueContext | null;
  currentTrack: Track | null;
  currentIndex: number;
  playing: boolean;
  shuffle: boolean;
  repeatMode: "off" | "all" | "one";
  playTracks: (tracks: Track[], startIndex?: number, queueKey?: string | null, options?: PlayerStartOptions) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  resetPlayback: () => void;
};

type PlayerTimelineContextValue = {
  progress: number;
  duration: number;
  volume: number;
  getAudioElement: () => HTMLAudioElement | null;
  seekTo: (seconds: number) => void;
  setVolume: (value: number) => void;
};

type PlayerHistoryContextValue = {
  history: PlaybackHistoryItem[];
  playHistoryItem: (item: PlaybackHistoryItem) => void;
  clearPlaybackHistory: () => void;
};

type FullPlayerContextValue = PlayerContextValue & PlayerTimelineContextValue;

type PlayerStartOptions = {
  resumeQueue?: boolean;
  queueContext?: QueueContext;
};

type QueueResumeSnapshot = {
  queueKey: string;
  trackId: number;
  index: number;
  progress: number;
  duration: number;
  updatedAt: number;
};

type PersistedPlayerState = {
  version: 1;
  queue: Track[];
  queueKey: string | null;
  queueContext?: QueueContext | null;
  playOrder: number[];
  playhead: number;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: "off" | "all" | "one";
  playing: boolean;
  savedAt: number;
};

type PersistedPlayerPosition = {
  version: 1;
  queueKey: string | null;
  trackId: number;
  playhead: number;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: "off" | "all" | "one";
  playing: boolean;
  savedAt: number;
};

const playerContextDefaults: PlayerContextValue = {
  queue: [],
  queueKey: null,
  queueContext: null,
  currentTrack: null,
  currentIndex: -1,
  playing: false,
  shuffle: false,
  repeatMode: "off",
  playTracks: () => undefined,
  togglePlayback: () => undefined,
  playNext: () => undefined,
  playPrevious: () => undefined,
  toggleShuffle: () => undefined,
  cycleRepeatMode: () => undefined,
  resetPlayback: () => undefined,
};

const playerTimelineDefaults: PlayerTimelineContextValue = {
  progress: 0,
  duration: 0,
  volume: 0.82,
  getAudioElement: () => null,
  seekTo: () => undefined,
  setVolume: () => undefined,
};

const PlayerContext = createContext<PlayerContextValue>(playerContextDefaults);
const PlayerTimelineContext = createContext<PlayerTimelineContextValue>(playerTimelineDefaults);
const PlayerHistoryContext = createContext<PlayerHistoryContextValue>({
  history: [],
  playHistoryItem: () => undefined,
  clearPlaybackHistory: () => undefined,
});

const mediaArtworkSizes = [96, 128, 192, 256, 384, 512];
const playerStateStorageKey = "birvana-player-state-v1";
const playerPositionStorageKey = "birvana-player-position-v1";
const playbackHistoryStorageKey = "birvana-play-history-v1";
const queueResumeStorageKey = "birvana-queue-resume-v1";
const maxSavedQueueLength = 160;
const maxHistoryItems = 10;
const maxQueueResumeItems = 80;
const positionPersistIntervalMs = 2800;
const sourceTransitionUnmuteDelayMs = 120;
const seekTransitionUnmuteDelayMs = 90;

function getStreamUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  return `/api/stream?url=${encodeURIComponent(url)}`;
}

function inferQueueContext(queueKey: string | null): QueueContext | null {
  if (!queueKey) {
    return null;
  }

  if (queueKey.startsWith("playlist:")) {
    const playlistId = queueKey.slice("playlist:".length);
    return { kind: "playlist", label: "Playlist", href: playlistId ? `/playlist/${playlistId}` : undefined };
  }

  if (queueKey === "liked") {
    return { kind: "liked", label: "Liked songs", href: "/liked" };
  }

  if (queueKey.startsWith("artist:")) {
    const artistId = queueKey.slice("artist:".length);
    return { kind: "artist", label: "Artist radio", href: artistId ? `/artist/${artistId}` : undefined };
  }

  if (queueKey.startsWith("discover-category:")) {
    const category = queueKey.slice("discover-category:".length).replace(/-/g, " ");
    return { kind: "discover", label: category ? `${category} mix` : "Discover mix", href: "/discover" };
  }

  if (queueKey.startsWith("discover")) {
    return { kind: "discover", label: "Discover", href: "/discover" };
  }

  if (queueKey.startsWith("history:")) {
    return { kind: "history", label: "History", href: "/history" };
  }

  if (queueKey.startsWith("collection:")) {
    return { kind: "library", label: "Library queue", href: "/library" };
  }

  return { kind: "collection", label: "Playing queue" };
}

function buildSequentialOrder(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function buildSmartShuffledOrder(tracks: Track[], startIndex: number) {
  const safeStartIndex = Math.min(Math.max(startIndex, 0), Math.max(tracks.length - 1, 0));

  if (!tracks.length) {
    return [];
  }

  const activeCategory = resolveTrackCategory(tracks[safeStartIndex]);
  const sameCategory: number[] = [];
  const otherCategory: number[] = [];

  for (let index = 0; index < tracks.length; index += 1) {
    if (index === safeStartIndex) {
      continue;
    }

    if (resolveTrackCategory(tracks[index]) === activeCategory) {
      sameCategory.push(index);
    } else {
      otherCategory.push(index);
    }
  }

  return [safeStartIndex, ...shuffleIndexes(sameCategory), ...shuffleIndexes(otherCategory)];
}

function shuffleIndexes(indexes: number[]) {
  const shuffled = [...indexes];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = currentValue;
  }

  return shuffled;
}

function buildMediaArtwork(coverUrl?: string | null): MediaImage[] | undefined {
  if (!coverUrl) {
    return undefined;
  }

  return mediaArtworkSizes.map((size) => ({
    src: coverUrl,
    sizes: `${size}x${size}`,
  }));
}

function readStorageJson<T>(key: string): T | null {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
}

function writeStorageJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private mode or if quota is full. Playback should keep working.
  }
}

function updateHistoryItemInStorage(item: PlaybackHistoryItem) {
  const currentHistory = readStorageJson<PlaybackHistoryItem[]>(playbackHistoryStorageKey) ?? [];
  const nextHistory = [
    item,
    ...currentHistory.filter((historyItem) => historyItem.track.id !== item.track.id),
  ].slice(0, maxHistoryItems);

  writeStorageJson(playbackHistoryStorageKey, nextHistory);
}

function removeDeletedTrackFromStorage(trackId: number) {
  const currentHistory = readStorageJson<PlaybackHistoryItem[]>(playbackHistoryStorageKey) ?? [];
  writeStorageJson(
    playbackHistoryStorageKey,
    currentHistory.filter((item) => item.track.id !== trackId),
  );

  const queueSnapshots = readStorageJson<Record<string, QueueResumeSnapshot>>(queueResumeStorageKey) ?? {};
  writeStorageJson(
    queueResumeStorageKey,
    Object.fromEntries(Object.entries(queueSnapshots).filter(([, item]) => item.trackId !== trackId)),
  );

  const playerState = readStorageJson<PersistedPlayerState>(playerStateStorageKey);
  if (playerState?.version === 1) {
    if (playerState.queue.some((track) => track.id === trackId)) {
      window.localStorage.removeItem(playerStateStorageKey);
    }
  }

  const playerPosition = readStorageJson<PersistedPlayerPosition>(playerPositionStorageKey);
  if (playerPosition?.version === 1 && playerPosition.trackId === trackId) {
    window.localStorage.removeItem(playerPositionStorageKey);
  }
}

function normalizeSavedProgress(progress: number, duration: number) {
  if (!Number.isFinite(progress) || progress < 0) {
    return 0;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return progress;
  }

  return Math.min(progress, Math.max(duration - 2, 0));
}

function buildHistoryItemFromSnapshot({
  queue,
  queueKey,
  queueContext,
  playOrder,
  playhead,
  progress,
  duration,
}: {
  queue: Track[];
  queueKey: string | null;
  queueContext: QueueContext | null;
  playOrder: number[];
  playhead: number;
  progress: number;
  duration: number;
}): PlaybackHistoryItem | null {
  const index = playOrder[playhead] ?? -1;
  const track = index >= 0 ? queue[index] : null;

  if (!track?.id) {
    return null;
  }

  return {
    track,
    queue: queue.slice(0, maxSavedQueueLength),
    queueKey,
    queueContext,
    index,
    progress: normalizeSavedProgress(progress, duration || track.duration_seconds || 0),
    duration: duration || track.duration_seconds || 0,
    updatedAt: Date.now(),
  };
}

function readQueueResumeSnapshot(queueKey: string, tracks: Track[]) {
  const snapshots = readStorageJson<Record<string, QueueResumeSnapshot>>(queueResumeStorageKey);
  const snapshot = snapshots?.[queueKey];

  if (!snapshot) {
    return null;
  }

  const matchingIndex = tracks.findIndex((track) => track.id === snapshot.trackId);
  const safeIndex = matchingIndex >= 0 ? matchingIndex : Math.min(Math.max(snapshot.index, 0), tracks.length - 1);
  const track = tracks[safeIndex];

  if (!track) {
    return null;
  }

  return {
    index: safeIndex,
    progress: normalizeSavedProgress(snapshot.progress, snapshot.duration || track.duration_seconds || 0),
    duration: snapshot.duration || track.duration_seconds || 0,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef("");
  const queueRef = useRef<Track[]>([]);
  const queueKeyRef = useRef<string | null>(null);
  const queueContextRef = useRef<QueueContext | null>(null);
  const playOrderRef = useRef<number[]>([]);
  const playheadRef = useRef(-1);
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const volumeRef = useRef(0.82);
  const playingRef = useRef(false);
  const reportedPlaysRef = useRef<Set<number>>(new Set());
  const shuffleRef = useRef(false);
  const repeatModeRef = useRef<"off" | "all" | "one">("off");
  const pendingSeekRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const lastPersistedAtRef = useRef(0);
  const audioTransitionTimeoutRef = useRef<number | null>(null);
  const sourceTransitionTokenRef = useRef(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueKey, setQueueKey] = useState<string | null>(null);
  const [queueContext, setQueueContext] = useState<QueueContext | null>(null);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [playhead, setPlayhead] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.82);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [history, setHistory] = useState<PlaybackHistoryItem[]>([]);

  const currentIndex = playhead >= 0 ? (playOrder[playhead] ?? -1) : -1;
  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  const clearAudioTransitionTimeout = useCallback(() => {
    if (audioTransitionTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(audioTransitionTimeoutRef.current);
    audioTransitionTimeoutRef.current = null;
  }, []);

  const muteAudioForTransition = useCallback((audio: HTMLAudioElement) => {
    clearAudioTransitionTimeout();
    audio.muted = true;
  }, [clearAudioTransitionTimeout]);

  const releaseAudioTransitionMute = useCallback((audio: HTMLAudioElement, delay = sourceTransitionUnmuteDelayMs) => {
    clearAudioTransitionTimeout();
    audioTransitionTimeoutRef.current = window.setTimeout(() => {
      audio.muted = false;
      audioTransitionTimeoutRef.current = null;
    }, delay);
  }, [clearAudioTransitionTimeout]);

  const seekAudioQuietly = useCallback((audio: HTMLAudioElement, seconds: number, fallbackDuration: number) => {
    if (!Number.isFinite(seconds)) {
      return;
    }

    const measuredDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallbackDuration;
    const boundedTime = measuredDuration > 0
      ? Math.min(Math.max(seconds, 0), measuredDuration)
      : Math.max(seconds, 0);
    const seekDelta = Math.abs(audio.currentTime - boundedTime);
    const shouldMuteSeek = !audio.paused && seekDelta > 1.25;

    if (shouldMuteSeek) {
      muteAudioForTransition(audio);
    }

    audio.currentTime = boundedTime;
    setProgress(boundedTime);

    if (shouldMuteSeek) {
      releaseAudioTransitionMute(audio, seekTransitionUnmuteDelayMs);
    }
  }, [muteAudioForTransition, releaseAudioTransitionMute]);

  const resetPlaybackState = useCallback(() => {
    const audio = audioRef.current;

    sourceTransitionTokenRef.current += 1;
    pendingSeekRef.current = null;
    clearAudioTransitionTimeout();

    if (audio) {
      audio.pause();
      audio.muted = false;
      audio.removeAttribute("src");
      audio.load();
    }

    sourceRef.current = "";
    queueRef.current = [];
    queueKeyRef.current = null;
    queueContextRef.current = null;
    playOrderRef.current = [];
    playheadRef.current = -1;
    progressRef.current = 0;
    durationRef.current = 0;
    playingRef.current = false;

    setQueue([]);
    setQueueKey(null);
    setQueueContext(null);
    setPlayOrder([]);
    setPlayhead(-1);
    setPlaying(false);
    setProgress(0);
    setDuration(0);

    try {
      window.localStorage.removeItem(playerStateStorageKey);
      window.localStorage.removeItem(playerPositionStorageKey);
    } catch {
      // Ignore storage failures; stopping playback should still complete.
    }
  }, [clearAudioTransitionTimeout]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueKeyRef.current = queueKey;
  }, [queueKey]);

  useEffect(() => {
    queueContextRef.current = queueContext;
  }, [queueContext]);

  useEffect(() => {
    playOrderRef.current = playOrder;
  }, [playOrder]);

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  const storeHistoryItem = useCallback((item: PlaybackHistoryItem) => {
    setHistory((currentHistory) => {
      const nextHistory = [
        item,
        ...currentHistory.filter((historyItem) => historyItem.track.id !== item.track.id),
      ].slice(0, maxHistoryItems);

      writeStorageJson(playbackHistoryStorageKey, nextHistory);
      return nextHistory;
    });
  }, []);

  const storeQueueResumeSnapshot = useCallback((item: PlaybackHistoryItem) => {
    if (!item.queueKey) {
      return;
    }

    const existingSnapshots = readStorageJson<Record<string, QueueResumeSnapshot>>(queueResumeStorageKey) ?? {};
    const nextSnapshot: QueueResumeSnapshot = {
      queueKey: item.queueKey,
      trackId: item.track.id,
      index: item.index,
      progress: item.progress,
      duration: item.duration || item.track.duration_seconds || 0,
      updatedAt: Date.now(),
    };
    const nextEntries = [
      [item.queueKey, nextSnapshot] as const,
      ...Object.entries(existingSnapshots).filter(([key]) => key !== item.queueKey),
    ].slice(0, maxQueueResumeItems);

    writeStorageJson(queueResumeStorageKey, Object.fromEntries(nextEntries));
  }, []);

  const persistPositionSnapshot = useCallback((force = false) => {
    if (typeof window === "undefined" || !restoredRef.current) {
      return;
    }

    const now = Date.now();

    if (!force && now - lastPersistedAtRef.current < positionPersistIntervalMs) {
      return;
    }

    const activeItem = buildHistoryItemFromSnapshot({
      queue: queueRef.current,
      queueKey: queueKeyRef.current,
      queueContext: queueContextRef.current,
      playOrder: playOrderRef.current,
      playhead: playheadRef.current,
      progress: progressRef.current,
      duration: durationRef.current,
    });

    if (!activeItem) {
      return;
    }

    const playerPosition: PersistedPlayerPosition = {
      version: 1,
      queueKey: queueKeyRef.current,
      trackId: activeItem.track.id,
      playhead: playheadRef.current,
      progress: activeItem.progress,
      duration: durationRef.current || activeItem.duration,
      volume: volumeRef.current,
      shuffle: shuffleRef.current,
      repeatMode: repeatModeRef.current,
      playing: playingRef.current,
      savedAt: now,
    };

    lastPersistedAtRef.current = now;
    writeStorageJson(playerPositionStorageKey, playerPosition);
    storeQueueResumeSnapshot(activeItem);
    updateHistoryItemInStorage(activeItem);
  }, [storeQueueResumeSnapshot]);

  const persistFullPlayerSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !restoredRef.current) {
      return;
    }

    const activeItem = buildHistoryItemFromSnapshot({
      queue: queueRef.current,
      queueKey: queueKeyRef.current,
      queueContext: queueContextRef.current,
      playOrder: playOrderRef.current,
      playhead: playheadRef.current,
      progress: progressRef.current,
      duration: durationRef.current,
    });

    if (!activeItem) {
      return;
    }

    const now = Date.now();
    const playerState: PersistedPlayerState = {
      version: 1,
      queue: queueRef.current.slice(0, maxSavedQueueLength),
      queueKey: queueKeyRef.current,
      queueContext: queueContextRef.current,
      playOrder: playOrderRef.current,
      playhead: playheadRef.current,
      progress: activeItem.progress,
      duration: durationRef.current || activeItem.duration,
      volume: volumeRef.current,
      shuffle: shuffleRef.current,
      repeatMode: repeatModeRef.current,
      playing: playingRef.current,
      savedAt: now,
    };

    writeStorageJson(playerStateStorageKey, playerState);
    writeStorageJson(playerPositionStorageKey, {
      version: 1,
      queueKey: queueKeyRef.current,
      trackId: activeItem.track.id,
      playhead: playheadRef.current,
      progress: activeItem.progress,
      duration: durationRef.current || activeItem.duration,
      volume: volumeRef.current,
      shuffle: shuffleRef.current,
      repeatMode: repeatModeRef.current,
      playing: playingRef.current,
      savedAt: now,
    } satisfies PersistedPlayerPosition);
    storeQueueResumeSnapshot(activeItem);
    updateHistoryItemInStorage(activeItem);
  }, [storeQueueResumeSnapshot]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    audio.volume = 0.82;
    audioRef.current = audio;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => {
      const nextDuration = audio.duration || 0;
      const pendingSeek = pendingSeekRef.current;

      setDuration(nextDuration);

      if (typeof pendingSeek === "number" && Number.isFinite(pendingSeek)) {
        const boundedTime = normalizeSavedProgress(pendingSeek, nextDuration);
        seekAudioQuietly(audio, boundedTime, nextDuration);
        pendingSeekRef.current = null;
      }
    };
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      const orderLength = playOrderRef.current.length;
      const currentPlayhead = playheadRef.current;

      if (repeatModeRef.current === "one") {
        seekAudioQuietly(audio, 0, durationRef.current);
        void audio.play().catch(() => {
          setPlaying(false);
        });
        return;
      }

      if (currentPlayhead < orderLength - 1) {
        setProgress(0);
        setPlayhead(currentPlayhead + 1);
        setPlaying(true);
        return;
      }

      if (repeatModeRef.current === "all" && orderLength > 0) {
        setProgress(0);
        setPlayhead(0);
        setPlaying(true);
        return;
      }

      audio.currentTime = 0;
      setProgress(0);
      setPlaying(false);
    };
    const handleEmptied = () => {
      setProgress(0);
      setDuration(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("emptied", handleEmptied);

    return () => {
      clearAudioTransitionTimeout();
      audio.pause();
      audio.muted = false;
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("emptied", handleEmptied);
    };
  }, [clearAudioTransitionTimeout, seekAudioQuietly]);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }

    const savedHistory = readStorageJson<PlaybackHistoryItem[]>(playbackHistoryStorageKey);
    const savedPlayerState = readStorageJson<PersistedPlayerState>(playerStateStorageKey);
    const savedPlayerPosition = readStorageJson<PersistedPlayerPosition>(playerPositionStorageKey);
    let cancelled = false;

    restoredRef.current = true;

    if (!savedPlayerState || savedPlayerState.version !== 1 || !savedPlayerState.queue.length) {
      if (Array.isArray(savedHistory)) {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            setHistory(savedHistory.slice(0, maxHistoryItems));
          }
        });
      }

      return () => {
        cancelled = true;
      };
    }

    const safePlayOrder = savedPlayerState.playOrder.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < savedPlayerState.queue.length,
    );
    const nextPlayOrder = safePlayOrder.length ? safePlayOrder : buildSequentialOrder(savedPlayerState.queue.length);
    const savedTrackIndex = savedPlayerPosition
      ? savedPlayerState.queue.findIndex((track) => track.id === savedPlayerPosition.trackId)
      : -1;
    const savedPositionMatches =
      savedPlayerPosition?.version === 1 &&
      savedPlayerPosition.queueKey === savedPlayerState.queueKey &&
      savedTrackIndex >= 0;
    let nextPlayhead = Math.min(
      Math.max(savedPlayerState.playhead, 0),
      Math.max(nextPlayOrder.length - 1, 0),
    );
    let restoredDuration =
      savedPlayerState.duration || savedPlayerState.queue[nextPlayOrder[nextPlayhead]]?.duration_seconds || 0;
    let nextProgress = normalizeSavedProgress(savedPlayerState.progress, restoredDuration);
    let restoredVolume = Number.isFinite(savedPlayerState.volume)
      ? Math.min(1, Math.max(0, savedPlayerState.volume))
      : 0.82;
    let restoredShuffle = savedPlayerState.shuffle;
    let restoredRepeatMode: "off" | "all" | "one" =
      savedPlayerState.repeatMode === "all" || savedPlayerState.repeatMode === "one"
        ? savedPlayerState.repeatMode
        : "off";
    let restoredPlaying = savedPlayerState.playing;

    if (savedPositionMatches) {
      const positionPlayhead = nextPlayOrder.findIndex((index) => index === savedTrackIndex);

      if (positionPlayhead >= 0) {
        nextPlayhead = positionPlayhead;
      }

      restoredDuration =
        savedPlayerPosition.duration || savedPlayerState.queue[savedTrackIndex]?.duration_seconds || restoredDuration;
      nextProgress = normalizeSavedProgress(savedPlayerPosition.progress, restoredDuration);
      restoredVolume = Number.isFinite(savedPlayerPosition.volume)
        ? Math.min(1, Math.max(0, savedPlayerPosition.volume))
        : restoredVolume;
      restoredShuffle = savedPlayerPosition.shuffle;
      restoredRepeatMode =
        savedPlayerPosition.repeatMode === "all" || savedPlayerPosition.repeatMode === "one"
          ? savedPlayerPosition.repeatMode
          : "off";
      restoredPlaying = savedPlayerPosition.playing;
    }

    pendingSeekRef.current = nextProgress;
    queueRef.current = savedPlayerState.queue;
    queueKeyRef.current = savedPlayerState.queueKey;
    queueContextRef.current = savedPlayerState.queueContext ?? inferQueueContext(savedPlayerState.queueKey);
    playOrderRef.current = nextPlayOrder;
    playheadRef.current = nextPlayhead;
    progressRef.current = nextProgress;
    durationRef.current = restoredDuration;
    volumeRef.current = restoredVolume;
    playingRef.current = restoredPlaying;
    shuffleRef.current = restoredShuffle;
    repeatModeRef.current = restoredRepeatMode;

    window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      if (Array.isArray(savedHistory)) {
        setHistory(savedHistory.slice(0, maxHistoryItems));
      }

      setQueue(savedPlayerState.queue);
      setQueueKey(savedPlayerState.queueKey);
      setQueueContext(savedPlayerState.queueContext ?? inferQueueContext(savedPlayerState.queueKey));
      setPlayOrder(nextPlayOrder);
      setPlayhead(nextPlayhead);
      setProgress(nextProgress);
      setDuration(restoredDuration);
      setVolumeState(restoredVolume);
      setShuffle(restoredShuffle);
      setRepeatMode(restoredRepeatMode);
      setPlaying(restoredPlaying);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!currentTrack?.audio_url) {
      sourceTransitionTokenRef.current += 1;
      clearAudioTransitionTimeout();
      audio.pause();
      audio.muted = false;
      audio.removeAttribute("src");
      audio.load();
      sourceRef.current = "";
      window.requestAnimationFrame(() => {
        setProgress(0);
        setDuration(0);
      });
      return;
    }

    const nextSource = getStreamUrl(currentTrack.audio_url);
    let sourceChanged = false;
    let transitionToken = sourceTransitionTokenRef.current;

    if (sourceRef.current !== nextSource) {
      const pendingSeek = pendingSeekRef.current;
      sourceChanged = true;
      transitionToken = sourceTransitionTokenRef.current + 1;
      sourceTransitionTokenRef.current = transitionToken;
      sourceRef.current = nextSource;
      muteAudioForTransition(audio);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.src = nextSource;
      audio.load();
      window.requestAnimationFrame(() => {
        setProgress(typeof pendingSeek === "number" ? pendingSeek : 0);
        setDuration(currentTrack.duration_seconds ?? 0);
      });
    } else if (typeof pendingSeekRef.current === "number") {
      const boundedTime = normalizeSavedProgress(
        pendingSeekRef.current,
        audio.duration || durationRef.current || currentTrack.duration_seconds || 0,
      );

      seekAudioQuietly(audio, boundedTime, durationRef.current || currentTrack.duration_seconds || 0);
      pendingSeekRef.current = null;
    }

    if (playing) {
      void audio
        .play()
        .then(() => {
          if (sourceChanged && sourceTransitionTokenRef.current === transitionToken) {
            releaseAudioTransitionMute(audio, sourceTransitionUnmuteDelayMs);
          }
        })
        .catch(() => {
          if (sourceChanged && sourceTransitionTokenRef.current === transitionToken) {
            releaseAudioTransitionMute(audio, sourceTransitionUnmuteDelayMs);
          }
          setPlaying(false);
        });
    } else {
      audio.pause();
      if (sourceChanged && sourceTransitionTokenRef.current === transitionToken) {
        releaseAudioTransitionMute(audio, sourceTransitionUnmuteDelayMs);
      }
    }
  }, [
    clearAudioTransitionTimeout,
    currentTrack,
    muteAudioForTransition,
    playing,
    releaseAudioTransitionMute,
    seekAudioQuietly,
  ]);

  useEffect(() => {
    if (!playing || !currentTrack?.id || !currentTrack.audio_path) {
      return;
    }

    if (reportedPlaysRef.current.has(currentTrack.id)) {
      return;
    }

    reportedPlaysRef.current.add(currentTrack.id);

    void fetch("/api/playback/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "play_started",
        trackId: currentTrack.id,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [currentTrack?.audio_path, currentTrack?.id, playing]);

  useEffect(() => {
    persistFullPlayerSnapshot();
  }, [currentTrack?.id, persistFullPlayerSnapshot, playOrder, queue, queueKey, repeatMode, shuffle]);

  useEffect(() => {
    persistPositionSnapshot(false);
  }, [persistPositionSnapshot, progress, playing, repeatMode, shuffle, volume]);

  useEffect(() => {
    const persistBeforeUnload = () => persistFullPlayerSnapshot();

    window.addEventListener("pagehide", persistBeforeUnload);
    window.addEventListener("beforeunload", persistBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", persistBeforeUnload);
      window.removeEventListener("beforeunload", persistBeforeUnload);
    };
  }, [persistFullPlayerSnapshot]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;

    if (!currentTrack) {
      mediaSession.metadata = null;
      mediaSession.playbackState = "none";
      return;
    }

    mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist_display,
      album: "BIRVANA",
      artwork: buildMediaArtwork(currentTrack.cover_url),
    });
    mediaSession.playbackState = playing ? "playing" : "paused";
  }, [currentTrack, playing]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;

    const startPlayback = () => {
      if (!currentTrack) {
        return;
      }

      setPlaying(true);
    };

    const pausePlayback = () => {
      if (!currentTrack) {
        return;
      }

      setPlaying(false);
    };

    const goNext = () => {
      const orderLength = playOrderRef.current.length;
      const currentPlayhead = playheadRef.current;

      if (orderLength <= 0 || currentPlayhead < 0) {
        return;
      }

      if (currentPlayhead < orderLength - 1) {
        setPlayhead(currentPlayhead + 1);
        setProgress(0);
        setPlaying(true);
        return;
      }

      if (repeatModeRef.current === "all") {
        setPlayhead(0);
        setProgress(0);
        setPlaying(true);
      }
    };

    const goPrevious = () => {
      const audio = audioRef.current;

      if (progressRef.current > 3) {
        if (audio) {
          seekAudioQuietly(audio, 0, durationRef.current);
        }
        return;
      }

      const orderLength = playOrderRef.current.length;
      const currentPlayhead = playheadRef.current;

      if (orderLength <= 0 || currentPlayhead < 0) {
        return;
      }

      if (currentPlayhead > 0) {
        setPlayhead(currentPlayhead - 1);
      } else if (repeatModeRef.current === "all") {
        setPlayhead(orderLength - 1);
      } else {
        setPlayhead(0);
      }

      setProgress(0);
      setPlaying(true);
    };

    const seekToPosition = (seekTime: number) => {
      const audio = audioRef.current;

      if (!audio || Number.isNaN(seekTime)) {
        return;
      }

      const boundedTime = Math.min(Math.max(seekTime, 0), audio.duration || duration || seekTime);
      seekAudioQuietly(audio, boundedTime, duration);
    };

    mediaSession.setActionHandler("play", startPlayback);
    mediaSession.setActionHandler("pause", pausePlayback);
    mediaSession.setActionHandler("previoustrack", goPrevious);
    mediaSession.setActionHandler("nexttrack", goNext);
    mediaSession.setActionHandler("seekbackward", (details) => {
      seekToPosition(progressRef.current - (details.seekOffset ?? 10));
    });
    mediaSession.setActionHandler("seekforward", (details) => {
      seekToPosition(progressRef.current + (details.seekOffset ?? 10));
    });
    mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        seekToPosition(details.seekTime);
      }
    });

    return () => {
      mediaSession.setActionHandler("play", null);
      mediaSession.setActionHandler("pause", null);
      mediaSession.setActionHandler("previoustrack", null);
      mediaSession.setActionHandler("nexttrack", null);
      mediaSession.setActionHandler("seekbackward", null);
      mediaSession.setActionHandler("seekforward", null);
      mediaSession.setActionHandler("seekto", null);
    };
  }, [currentTrack, duration, seekAudioQuietly]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !currentTrack) {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Math.max(duration, 0.1),
        playbackRate: audio.playbackRate || 1,
        position: Math.min(progress, Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Math.max(duration, progress)),
      });
    } catch {
      // Some browsers reject position state before enough metadata is available.
    }
  }, [currentTrack, duration, progress, playing]);

  useEffect(() => {
    const handleTrackDeleted = (event: Event) => {
      const trackId = (event as CustomEvent<{ trackId?: number }>).detail?.trackId;

      if (!trackId) {
        return;
      }

      const previousQueue = queueRef.current;
      const deletedIndex = previousQueue.findIndex((track) => track.id === trackId);

      if (deletedIndex < 0) {
        setHistory((currentHistory) => currentHistory.filter((item) => item.track.id !== trackId));
        removeDeletedTrackFromStorage(trackId);
        return;
      }

      const activeTrackWasDeleted = currentIndex >= 0 && previousQueue[currentIndex]?.id === trackId;
      const nextQueue = previousQueue.filter((track) => track.id !== trackId);
      const remappedOrder = playOrderRef.current
        .filter((index) => index !== deletedIndex)
        .map((index) => (index > deletedIndex ? index - 1 : index))
        .filter((index) => index >= 0 && index < nextQueue.length);
      const nextPlayhead = activeTrackWasDeleted
        ? -1
        : Math.min(playheadRef.current, Math.max(remappedOrder.length - 1, -1));

      if (activeTrackWasDeleted) {
        const audio = audioRef.current;
        sourceTransitionTokenRef.current += 1;
        clearAudioTransitionTimeout();
        audio?.pause();
        if (audio) {
          audio.muted = false;
        }
        audio?.removeAttribute("src");
        audio?.load();
        sourceRef.current = "";
        setPlaying(false);
        setProgress(0);
        setDuration(0);
      }

      setQueue(nextQueue);
      setPlayOrder(remappedOrder);
      setPlayhead(nextPlayhead);
      setHistory((currentHistory) => currentHistory.filter((item) => item.track.id !== trackId));
      removeDeletedTrackFromStorage(trackId);
    };

    window.addEventListener("birvana:track-deleted", handleTrackDeleted);

    return () => {
      window.removeEventListener("birvana:track-deleted", handleTrackDeleted);
    };
  }, [clearAudioTransitionTimeout, currentIndex]);

  const playbackValue = useMemo<PlayerContextValue>(
    () => ({
      queue,
      queueKey,
      queueContext,
      currentTrack,
      currentIndex,
      playing,
      shuffle,
      repeatMode,
      playTracks(tracks, startIndex = 0, nextQueueKey = null, options) {
        if (!tracks.length) return;
        const savedQueuePosition =
          options?.resumeQueue && nextQueueKey ? readQueueResumeSnapshot(nextQueueKey, tracks) : null;
        const safeStartIndex = savedQueuePosition?.index ?? Math.min(Math.max(startIndex, 0), tracks.length - 1);
        const savedProgress = savedQueuePosition?.progress ?? 0;
        const savedDuration = savedQueuePosition?.duration ?? tracks[safeStartIndex]?.duration_seconds ?? 0;
        const nextOrder = shuffleRef.current
          ? buildSmartShuffledOrder(tracks, safeStartIndex)
          : buildSequentialOrder(tracks.length);
        const nextPlayhead = shuffleRef.current ? 0 : safeStartIndex;
        const selectedTrack = tracks[safeStartIndex];
        const nextQueueContext = options?.queueContext ?? inferQueueContext(nextQueueKey);

        pendingSeekRef.current = savedProgress > 0 ? savedProgress : null;
        setQueue(tracks);
        setQueueKey(nextQueueKey);
        setQueueContext(nextQueueContext);
        setPlayOrder(nextOrder);
        setPlayhead(nextPlayhead);
        setProgress(savedProgress);
        setDuration(savedDuration);
        setPlaying(true);
        const startedItem = {
          track: selectedTrack,
          queue: tracks.slice(0, maxSavedQueueLength),
          queueKey: nextQueueKey,
          queueContext: nextQueueContext,
          index: safeStartIndex,
          progress: savedProgress,
          duration: savedDuration,
          updatedAt: Date.now(),
        };

        storeQueueResumeSnapshot(startedItem);
        storeHistoryItem(startedItem);
      },
      togglePlayback() {
        if (!currentTrack) return;
        setPlaying((state) => !state);
      },
      playNext() {
        const orderLength = playOrderRef.current.length;
        const currentPlayhead = playheadRef.current;

        if (orderLength <= 0 || currentPlayhead < 0) {
          return;
        }

        if (currentPlayhead < orderLength - 1) {
          setPlayhead(currentPlayhead + 1);
          setProgress(0);
          setPlaying(true);
          return;
        }

        if (repeatModeRef.current === "all") {
          setPlayhead(0);
          setProgress(0);
          setPlaying(true);
          return;
        }

        setPlaying(false);
      },
      playPrevious() {
        if (progressRef.current > 3) {
          const audio = audioRef.current;
          if (audio) {
            seekAudioQuietly(audio, 0, durationRef.current);
          }
          return;
        }

        const orderLength = playOrderRef.current.length;
        const currentPlayhead = playheadRef.current;

        if (orderLength <= 0 || currentPlayhead < 0) {
          return;
        }

        if (currentPlayhead > 0) {
          setPlayhead(currentPlayhead - 1);
        } else if (repeatModeRef.current === "all") {
          setPlayhead(orderLength - 1);
        } else {
          setPlayhead(0);
        }

        setProgress(0);
        setPlaying(true);
      },
      toggleShuffle() {
        setShuffle((state) => {
          const nextShuffle = !state;
          const queueLength = queueRef.current.length;
          const activeIndex =
            playheadRef.current >= 0 ? (playOrderRef.current[playheadRef.current] ?? 0) : 0;

          if (!queueLength) {
            setPlayOrder([]);
            setPlayhead(-1);
            return nextShuffle;
          }

          const nextOrder = nextShuffle
            ? buildSmartShuffledOrder(queueRef.current, activeIndex)
            : buildSequentialOrder(queueLength);
          const nextPlayhead = nextShuffle ? 0 : activeIndex;

          setPlayOrder(nextOrder);
          setPlayhead(nextPlayhead);
          return nextShuffle;
        });
      },
      cycleRepeatMode() {
        setRepeatMode((state) => {
          if (state === "off") {
            return "all";
          }

          if (state === "all") {
            return "one";
          }

          return "off";
        });
      },
      resetPlayback() {
        resetPlaybackState();
      },
    }),
    [
      currentIndex,
      currentTrack,
      playing,
      queue,
      queueKey,
      queueContext,
      repeatMode,
      resetPlaybackState,
      seekAudioQuietly,
      shuffle,
      storeHistoryItem,
      storeQueueResumeSnapshot,
    ],
  );

  const getAudioElement = useCallback(() => audioRef.current, []);

  const timelineValue = useMemo<PlayerTimelineContextValue>(
    () => ({
      progress,
      duration,
      volume,
      getAudioElement,
      seekTo(seconds) {
        const audio = audioRef.current;
        if (!audio) return;
        seekAudioQuietly(audio, seconds, duration);
      },
      setVolume(value) {
        const nextValue = Math.min(1, Math.max(0, value));
        setVolumeState(nextValue);
      },
    }),
    [duration, getAudioElement, progress, seekAudioQuietly, volume],
  );

  const historyValue = useMemo<PlayerHistoryContextValue>(
    () => ({
      history,
      playHistoryItem(item) {
        const itemQueue = item.queue.length ? item.queue : [item.track];
        const queueIndex = itemQueue.findIndex((track) => track.id === item.track.id);
        const safeIndex = queueIndex >= 0 ? queueIndex : Math.min(Math.max(item.index, 0), itemQueue.length - 1);
        const nextOrder = buildSequentialOrder(itemQueue.length);
        const nextProgress = normalizeSavedProgress(item.progress, item.duration || item.track.duration_seconds || 0);

        pendingSeekRef.current = nextProgress;
        setQueue(itemQueue);
        setQueueKey(item.queueKey ?? `history:${item.track.id}`);
        setQueueContext(item.queueContext ?? inferQueueContext(item.queueKey ?? `history:${item.track.id}`));
        setPlayOrder(nextOrder);
        setPlayhead(safeIndex);
        setProgress(nextProgress);
        setDuration(item.duration || item.track.duration_seconds || 0);
        setPlaying(true);
        storeHistoryItem({
          ...item,
          queue: itemQueue,
          queueKey: item.queueKey ?? `history:${item.track.id}`,
          queueContext: item.queueContext ?? inferQueueContext(item.queueKey ?? `history:${item.track.id}`),
          index: safeIndex,
          progress: nextProgress,
          updatedAt: Date.now(),
        });
      },
      clearPlaybackHistory() {
        setHistory([]);
        try {
          window.localStorage.removeItem(playbackHistoryStorageKey);
        } catch {
          // Ignore storage failures; clearing history should not break playback.
        }
      },
    }),
    [history, storeHistoryItem],
  );

  return (
    <PlayerContext.Provider value={playbackValue}>
      <PlayerTimelineContext.Provider value={timelineValue}>
        <PlayerHistoryContext.Provider value={historyValue}>{children}</PlayerHistoryContext.Provider>
      </PlayerTimelineContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayerPlayback() {
  return useContext(PlayerContext);
}

export function usePlayerTimeline() {
  return useContext(PlayerTimelineContext);
}

export function usePlayer(): FullPlayerContextValue {
  const playback = usePlayerPlayback();
  const timeline = usePlayerTimeline();
  return useMemo(() => ({ ...playback, ...timeline }), [playback, timeline]);
}

export function usePlayerHistory() {
  return useContext(PlayerHistoryContext);
}
