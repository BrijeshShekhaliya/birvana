"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, PencilLine, Trash2 } from "lucide-react";
import styles from "./StudioTrackMenu.module.css";

export function StudioTrackMenu({
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
      const menuWidth = menuRef.current?.offsetWidth ?? 180;
      const menuHeight = menuRef.current?.offsetHeight ?? 112;
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

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Track options"
        aria-expanded={open}
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
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <PencilLine size={16} />
                <span>Edit details</span>
              </button>

              <button
                type="button"
                className={`${styles.menuItem} ${styles.delete}`}
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 size={16} />
                <span>Delete song</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
