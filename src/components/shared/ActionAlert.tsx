"use client";

import styles from "./ActionAlert.module.css";

export function ActionAlert({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.eyebrow}>BIRVANA</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <button type="button" className={styles.button} onClick={onClose}>
          Okay
        </button>
      </div>
    </div>
  );
}
