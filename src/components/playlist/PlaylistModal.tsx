"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import styles from "./PlaylistModal.module.css";

export function PlaylistModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousOverlayState = document.body.dataset.overlayOpen;
    document.body.style.overflow = "hidden";
    document.body.dataset.overlayOpen = "true";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousOverlayState) {
        document.body.dataset.overlayOpen = previousOverlayState;
      } else {
        delete document.body.dataset.overlayOpen;
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
