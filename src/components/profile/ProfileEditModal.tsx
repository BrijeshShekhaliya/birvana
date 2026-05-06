"use client";

import { useEffect, useState } from "react";
import { PencilLine, X } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import type { Profile } from "@/types/models";
import styles from "./ProfileEditModal.module.css";

export function ProfileEditModal({
  profile,
  triggerClassName,
}: {
  profile: Profile;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button type="button" className={triggerClassName ?? styles.trigger} onClick={() => setOpen(true)}>
        <PencilLine size={17} strokeWidth={2} />
        Edit profile
      </button>

      {open ? (
        <div className={styles.overlay} role="presentation" onClick={() => setOpen(false)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div>
                <p className={styles.kicker}>Account</p>
                <h2 id="edit-profile-title">Edit profile</h2>
              </div>
              <button type="button" className={styles.close} aria-label="Close profile editor" onClick={() => setOpen(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.body}>
              <ProfileEditForm profile={profile} onSaved={() => setOpen(false)} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
