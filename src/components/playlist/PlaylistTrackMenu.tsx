"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Trash2 } from "lucide-react";
import { removeTrackFromPlaylistAction } from "@/app/actions";
import styles from "./PlaylistTrackMenu.module.css";

export function PlaylistTrackMenu({
  playlistTrackId,
  open,
  onOpenChange,
  onRemove,
}: {
  playlistTrackId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove?: (playlistTrackId: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 164;
      const menuHeight = menuRef.current?.offsetHeight ?? 64;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = Math.max(12, Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 12));
      const belowTop = rect.bottom + 8;
      const top =
        belowTop + menuHeight <= viewportHeight - 12
          ? belowTop
          : Math.max(12, rect.top - menuHeight - 8);

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      onOpenChange(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  const handleRemove = () => {
    onOpenChange(false);
    if (onRemove) {
      onRemove(playlistTrackId);
      return;
    }

    startTransition(async () => {
      try {
        await removeTrackFromPlaylistAction(playlistTrackId);
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Track options"
        aria-expanded={open}
        disabled={pending}
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical size={18} />
      </button>

      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              ref={menuRef}
              className={styles.menu}
              style={{ top: `${position.top}px`, left: `${position.left}px` }}
            >
              <button type="button" className={styles.menuItem} onClick={handleRemove}>
                <Trash2 size={16} />
                <span>Remove</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
