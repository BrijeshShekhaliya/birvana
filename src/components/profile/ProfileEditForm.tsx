"use client";

import { useTransition } from "react";
import type { FormEvent } from "react";
import { Save } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
import { useToast } from "@/components/shared/ToastProvider";
import type { Profile } from "@/types/models";
import styles from "./ProfileEditForm.module.css";

export function ProfileEditForm({ profile, onSaved }: { profile: Profile; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateProfileAction(formData);
        notify("Profile updated.", "success");
        onSaved?.();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Could not update profile.", "error");
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>Display name</span>
        <input
          name="displayName"
          maxLength={80}
          required
          defaultValue={profile.display_name}
          placeholder="Your public name"
        />
      </label>

      <label className={styles.field}>
        <span>Username</span>
        <input
          name="username"
          pattern="[a-z0-9_]{3,30}"
          defaultValue={profile.username ?? ""}
          placeholder="brijesh_music"
        />
      </label>

      <label className={styles.field}>
        <span>Avatar URL</span>
        <input
          name="avatarUrl"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://example.com/avatar.jpg"
        />
      </label>

      <label className={styles.field}>
        <span>Bio</span>
        <textarea
          name="bio"
          maxLength={220}
          defaultValue={profile.bio ?? ""}
          placeholder="Tell listeners what this profile is about."
          rows={4}
        />
      </label>

      <button type="submit" className={styles.submit} disabled={pending}>
        <Save size={16} strokeWidth={2} />
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
