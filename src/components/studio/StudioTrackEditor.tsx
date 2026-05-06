"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Disc3, Globe2, ImagePlus, LockKeyhole, Radio } from "lucide-react";
import { updateTrackDetailsAction } from "@/app/actions";
import { ActionAlert } from "@/components/shared/ActionAlert";
import { LazyImage } from "@/components/shared/LazyImage";
import { evictCachedMedia } from "@/lib/media/clientMediaCache";
import { describeCoverOptimization, prepareCoverImage } from "@/lib/media/prepareCoverImage";
import type { Track, Visibility } from "@/types/models";
import styles from "./StudioTrackEditor.module.css";

const visibilityOptions: Array<{
  value: Visibility;
  label: string;
  description: string;
  icon: typeof Globe2;
}> = [
  {
    value: "public",
    label: "Public",
    description: "Shows across Discover and public artist surfaces.",
    icon: Globe2,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Hidden from browsing, but available to direct links.",
    icon: Radio,
  },
  {
    value: "private",
    label: "Private",
    description: "Stays inside Studio until you decide to share it.",
    icon: LockKeyhole,
  },
];

export function StudioTrackEditor({
  track,
  onSaved,
}: {
  track: Track;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [artistDisplay, setArtistDisplay] = useState(track.artist_display);
  const [visibility, setVisibility] = useState<Visibility>(track.visibility);
  const [removeCover, setRemoveCover] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [coverStatus, setCoverStatus] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const coverObjectUrl = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  const previewUrl = removeCover ? null : coverObjectUrl ?? track.cover_url ?? null;

  useEffect(() => {
    return () => {
      if (coverObjectUrl) {
        URL.revokeObjectURL(coverObjectUrl);
      }
    };
  }, [coverObjectUrl]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCoverStatus("");

    const formData = new FormData();
    formData.set("trackId", String(track.id));
    formData.set("title", title);
    formData.set("artistDisplay", artistDisplay);
    formData.set("visibility", visibility);
    formData.set("removeCover", removeCover ? "true" : "false");

    if (cover) {
      formData.set("cover", cover);
    }

    startTransition(async () => {
      try {
        await updateTrackDetailsAction(formData);
        if (cover || removeCover) {
          evictCachedMedia([track.cover_url]);
        }
        onSaved();
      } catch (nextError) {
        console.error(nextError);
        setError(nextError instanceof Error ? nextError.message : "Could not update the track.");
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.coverPanel}>
        <div className={styles.coverFrame}>
          {previewUrl ? (
            <LazyImage src={previewUrl} alt={title} className={styles.coverImage} eager />
          ) : (
            <div className={styles.coverFallback}>
              <Disc3 size={28} strokeWidth={1.8} />
            </div>
          )}
        </div>

        <div className={styles.coverActions}>
          <label className={styles.coverButton}>
            <ImagePlus size={16} />
            <span>{cover ? cover.name : previewUrl ? "Change image" : "Add image"}</span>
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

          {(track.cover_url || cover) && !removeCover ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setCover(null);
                setRemoveCover(true);
              }}
            >
              Remove image
            </button>
          ) : null}

          {removeCover ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setRemoveCover(false)}
            >
              Keep image
            </button>
          ) : null}
        </div>

        {coverStatus ? <p className={styles.notice}>{coverStatus}</p> : null}
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Song title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label className={styles.field}>
          <span>Artist name</span>
          <input
            value={artistDisplay}
            onChange={(event) => setArtistDisplay(event.target.value)}
            required
          />
        </label>
      </div>

      <div className={styles.noteCard}>
        <Disc3 size={16} />
        <span>The uploaded audio file stays locked. You can change the name, artist credit, image, and visibility.</span>
      </div>

      <div className={styles.visibilityGrid}>
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const active = visibility === option.value;

          return (
            <label
              key={option.value}
              className={`${styles.visibilityCard} ${active ? styles.visibilityCardActive : ""}`}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={active}
                onChange={() => setVisibility(option.value)}
              />
              <span className={styles.visibilityIcon}>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className={styles.visibilityCopy}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={isPending || coverBusy}>
          {coverBusy ? "Preparing image..." : isPending ? "Saving..." : "Save changes"}
        </button>
      </div>

      <ActionAlert
        open={Boolean(alertMessage)}
        title="Cover image is too large"
        message={alertMessage}
        onClose={() => setAlertMessage("")}
      />
    </form>
  );
}
