"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePlaylistAction, updatePlaylistDetailsAction } from "@/app/actions";
import { ActionAlert } from "@/components/shared/ActionAlert";
import { evictCachedMedia } from "@/lib/media/clientMediaCache";
import { describeCoverOptimization, prepareCoverImage } from "@/lib/media/prepareCoverImage";
import type { Playlist } from "@/types/models";
import styles from "./PlaylistSettingsPanel.module.css";

export function PlaylistSettingsPanel({ playlist }: { playlist: Playlist }) {
  const router = useRouter();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [visibility, setVisibility] = useState<"private" | "public" | "unlisted">(playlist.visibility);
  const [removeCover, setRemoveCover] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [coverStatus, setCoverStatus] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    setError("");
    setCoverStatus("");

    const formData = new FormData();
    formData.set("playlistId", playlist.id);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("visibility", visibility);
    formData.set("removeCover", removeCover ? "true" : "false");

    if (cover) {
      formData.set("cover", cover);
    }

    startTransition(async () => {
      try {
        await updatePlaylistDetailsAction(formData);
        if (cover || removeCover) {
          evictCachedMedia([playlist.cover_url]);
        }
        setFeedback("Playlist updated.");
        setCover(null);
      } catch (nextError) {
        console.error(nextError);
        setError(nextError instanceof Error ? nextError.message : "Could not update playlist.");
      }
    });
  };

  const onDelete = () => {
    const confirmed = window.confirm("Delete this playlist? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    setFeedback("");
    setError("");

    startTransition(async () => {
      try {
        await deletePlaylistAction(playlist.id);
        evictCachedMedia([playlist.cover_url]);
        router.push("/library");
      } catch (nextError) {
        console.error(nextError);
        setError(nextError instanceof Error ? nextError.message : "Could not delete playlist.");
      }
    });
  };

  return (
    <section className={styles.panel}>
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label className={styles.field}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What is this playlist for?"
            />
          </label>

          <label className={styles.field}>
            <span>Visibility</span>
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as "private" | "public" | "unlisted")
              }
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </label>

          <div className={styles.coverRow}>
            <label className={styles.uploadButton}>
              <ImagePlus size={16} />
              <span>{cover ? cover.name : playlist.cover_url && !removeCover ? "Change cover" : "Add cover"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  event.target.value = "";

                  if (!nextFile) {
                    return;
                  }

                  setCoverBusy(true);
                  setCoverStatus("");

                  try {
                    const result = await prepareCoverImage(nextFile);

                    if (result.kind === "error") {
                      setAlertMessage(result.message);
                      setCover(null);
                      return;
                    }

                    setCover(result.file);
                    setRemoveCover(false);

                    if (result.compressed) {
                      setCoverStatus(
                        describeCoverOptimization(result.originalSize, result.finalSize),
                      );
                    }
                  } finally {
                    setCoverBusy(false);
                  }
                }}
              />
            </label>

            {playlist.cover_url ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setCover(null);
                  setRemoveCover((state) => !state);
                }}
              >
                {removeCover ? "Keep cover" : "Remove cover"}
              </button>
            ) : null}
          </div>

          {coverStatus ? <p className={styles.feedback}>{coverStatus}</p> : null}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={isPending || coverBusy}>
            {coverBusy ? "Preparing image..." : isPending ? "Saving..." : "Save playlist"}
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>

        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>

      <ActionAlert
        open={Boolean(alertMessage)}
        title="Cover image is too large"
        message={alertMessage}
        onClose={() => setAlertMessage("")}
      />
    </section>
  );
}
