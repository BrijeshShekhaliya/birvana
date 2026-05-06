"use client";

import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { removeTrackFromPlaylistAction, reorderPlaylistTracksAction } from "@/app/actions";
import { PlaylistTrackItem } from "@/components/playlist/PlaylistTrackItem";
import { PlaylistTrackMenu } from "@/components/playlist/PlaylistTrackMenu";
import type { QueueContext } from "@/components/player/PlayerProvider";
import type { PlaylistTrack } from "@/types/models";
import styles from "./PlaylistTrackList.module.css";

const SortableTrackRow = memo(function SortableTrackRow({
  entry,
  orderedTracks,
  index,
  initialLiked,
  showLikeButton,
  queueKey,
  queueContext,
  isOwner,
  menuOpen,
  onMenuOpenChange,
  onRemove,
}: {
  entry: PlaylistTrack;
  orderedTracks: NonNullable<PlaylistTrack["track"]>[];
  index: number;
  initialLiked: boolean;
  showLikeButton: boolean;
  queueKey: string;
  queueContext?: QueueContext;
  isOwner: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRemove?: (playlistTrackId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: !isOwner,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!entry.track) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${isDragging ? styles.itemDragging : ""}`}
    >
      <PlaylistTrackItem
        track={entry.track}
        tracks={orderedTracks}
        index={index}
        initialLiked={initialLiked}
        showLikeButton={showLikeButton}
        queueKey={queueKey}
        queueContext={queueContext}
        menu={
          isOwner ? (
            <div className={styles.rowUtilities}>
              <button
                type="button"
                className={styles.dragHandle}
                aria-label="Drag to reorder"
                {...attributes}
                {...listeners}
              >
                <GripVertical size={18} />
              </button>
              <PlaylistTrackMenu
                playlistTrackId={entry.id}
                open={menuOpen}
                onOpenChange={onMenuOpenChange}
                onRemove={onRemove}
              />
            </div>
          ) : null
        }
      />
    </div>
  );
});

export function PlaylistTrackList({
  playlistId,
  playlistName,
  entries,
  likedSongIds,
  showLikeButton,
  isOwner,
  searchQuery = "",
  onEntriesChange,
  onTrackRemoved,
}: {
  playlistId: string;
  playlistName?: string;
  entries: PlaylistTrack[];
  likedSongIds: number[];
  showLikeButton: boolean;
  isOwner: boolean;
  searchQuery?: string;
  onEntriesChange?: (entries: PlaylistTrack[]) => void;
  onTrackRemoved?: (entry: PlaylistTrack) => void;
}) {
  const [items, setItems] = useState(entries);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const likedSongIdSet = useMemo(() => new Set(likedSongIds), [likedSongIds]);
  const deferredQuery = searchQuery.trim().toLowerCase();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 80, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const queueKey = `playlist:${playlistId}`;
  const queueContext: QueueContext = {
    kind: "playlist",
    label: playlistName ?? "Playlist",
    href: `/playlist/${playlistId}`,
  };

  const normalizePositions = (nextItems: PlaylistTrack[]) =>
    nextItems.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));

  useEffect(() => {
    setItems(entries);
  }, [entries]);

  const visibleItems = useMemo(() => {
    if (!deferredQuery) {
      return items;
    }

    return items.filter((entry) => {
      const track = entry.track;
      if (!track) {
        return false;
      }

      return `${track.title} ${track.artist_display}`.toLowerCase().includes(deferredQuery);
    });
  }, [deferredQuery, items]);

  const orderedTracks = useMemo(
    () => visibleItems.map((entry) => entry.track).filter(Boolean) as NonNullable<PlaylistTrack["track"]>[],
    [visibleItems],
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!isOwner || !over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((entry) => entry.id === active.id);
    const newIndex = items.findIndex((entry) => entry.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextItems = normalizePositions(arrayMove(items, oldIndex, newIndex));
    setOpenMenuId(null);
    setItems(nextItems);
    onEntriesChange?.(nextItems);

    startTransition(async () => {
      try {
        await reorderPlaylistTracksAction(
          playlistId,
          nextItems.map((entry) => entry.id),
        );
      } catch (error) {
        console.error(error);
        setItems(entries);
        onEntriesChange?.(entries);
      }
    });
  };

  const handleRemove = (playlistTrackId: number) => {
    const previousItems = items;
    const removedEntry = previousItems.find((entry) => entry.id === playlistTrackId);
    const nextItems = normalizePositions(previousItems.filter((entry) => entry.id !== playlistTrackId));
    setOpenMenuId(null);
    setItems(nextItems);
    onEntriesChange?.(nextItems);
    if (removedEntry) {
      onTrackRemoved?.(removedEntry);
    }

    startTransition(async () => {
      try {
        await removeTrackFromPlaylistAction(playlistTrackId);
      } catch (error) {
        console.error(error);
        setItems(previousItems);
        onEntriesChange?.(previousItems);
      }
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visibleItems.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.list}>
          {visibleItems.map((entry, index) => (
            <SortableTrackRow
              key={entry.id}
              entry={entry}
              orderedTracks={orderedTracks}
              index={index}
              initialLiked={likedSongIdSet.has(entry.song_id)}
              showLikeButton={showLikeButton}
              queueKey={queueKey}
              queueContext={queueContext}
              isOwner={isOwner}
              menuOpen={openMenuId === entry.id}
              onMenuOpenChange={(open) => setOpenMenuId(open ? entry.id : null)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
