"use client";

import { CheckCircle2, Globe2, ImagePlus, LoaderCircle, LockKeyhole, Music4, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./UploadSongForm.module.css";
import type { Visibility } from "@/types/models";

const visibilityOptions: Array<{
  value: Visibility;
  label: string;
  description: string;
  icon: typeof Globe2;
}> = [
  {
    value: "public",
    label: "Public",
    description: "Appears across Discover and artist pages right away.",
    icon: Globe2,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Hidden from browsing, but ready to share directly.",
    icon: Radio,
  },
  {
    value: "private",
    label: "Private",
    description: "Only visible inside your Studio until you are ready.",
    icon: LockKeyhole,
  },
];

function formatFileSize(file: File | null) {
  if (!file) {
    return "No file selected";
  }

  const sizeInMb = file.size / (1024 * 1024);

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(file.size / 1024))} KB`;
}

export function UploadSongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [inputResetKey, setInputResetKey] = useState(0);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!audio || !cover) return;

    setPending(true);
    setMessage("");
    setMessageTone("success");

    const formData = new FormData();
    formData.set("title", title);
    formData.set("artist", artist);
    formData.set("visibility", visibility);
    formData.set("audio", audio);
    formData.set("cover", cover);

    const response = await fetch("/api/upload/song", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      processingMode?: "copy-mp3" | "remux-aac" | "transcode-aac";
    };

    if (!response.ok) {
      setPending(false);
      setMessageTone("error");
      setMessage(payload.error || "Upload failed.");
      return;
    }

    setPending(false);
    setTitle("");
    setArtist("");
    setVisibility("public");
    setAudio(null);
    setCover(null);
    setInputResetKey((current) => current + 1);
    setMessageTone("success");
    setMessage(
      payload.processingMode === "transcode-aac"
        ? "Upload finished. The track was prepared for smooth playback."
        : "Upload finished. Your file is ready to play.",
    );
    router.replace(visibility === "public" ? "/discover" : "/studio/tracks");
    router.refresh();
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formHero}>
        <div className={styles.formHeroCopy}>
          <p className={styles.kicker}>Release composer</p>
          <h2 className={styles.title}>Send the song once, then manage it from Studio.</h2>
          <p className={styles.note}>
            Add the title, artist credit, visibility, audio, and artwork in one pass. After
            upload, the track stays editable in Studio while the audio file remains locked.
          </p>
        </div>

        <div className={styles.formHeroStats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Audio</span>
            <strong className={styles.statValue}>
              {audio ? audio.name.split(".").pop()?.toUpperCase() || "Ready" : "Missing"}
            </strong>
            <span className={styles.statMeta}>{audio ? formatFileSize(audio) : "Upload your main file"}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Artwork</span>
            <strong className={styles.statValue}>{cover ? "Ready" : "Missing"}</strong>
            <span className={styles.statMeta}>{cover ? cover.name : "Square cover recommended"}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Access</span>
            <strong className={styles.statValue}>{visibility}</strong>
            <span className={styles.statMeta}>Set how listeners will reach it</span>
          </div>
        </div>
      </div>

      <div className={styles.editorShell}>
        <section className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionEyebrow}>Release details</p>
              <h3 className={styles.sectionTitle}>Name the song and set the artist credit</h3>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Song title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Give the track a clear title"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Artist display</span>
                <input
                  value={artist}
                  onChange={(event) => setArtist(event.target.value)}
                  placeholder="How the artist name should appear"
                  required
                />
              </label>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionEyebrow}>Visibility</p>
              <h3 className={styles.sectionTitle}>Choose where this release should show up</h3>
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
                      className={styles.visibilityInput}
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={active}
                      onChange={() => setVisibility(option.value)}
                    />
                    <span className={styles.visibilityIcon}>
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className={styles.visibilityCopy}>
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionEyebrow}>Files</p>
              <h3 className={styles.sectionTitle}>Drop in the audio and the cover art</h3>
            </div>

            <div className={styles.uploadGrid}>
              <label className={styles.uploadCard}>
                <div className={styles.uploadIcon}>
                  <Music4 size={22} strokeWidth={1.9} />
                </div>
                <div className={styles.uploadCopy}>
                  <strong>Audio file</strong>
                  <span>MP3, WAV, AAC, and other common audio files are accepted.</span>
                </div>
                <input
                  key={`audio-${inputResetKey}`}
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudio(event.target.files?.[0] ?? null)}
                  required
                />
                <small className={styles.uploadMeta}>
                  {audio ? `${audio.name} · ${formatFileSize(audio)}` : "Upload the main audio file for this release."}
                </small>
              </label>

              <label className={styles.uploadCard}>
                <div className={styles.uploadIcon}>
                  <ImagePlus size={22} strokeWidth={1.9} />
                </div>
                <div className={styles.uploadCopy}>
                  <strong>Cover image</strong>
                  <span>Use square artwork for the cleanest playlist and track cards.</span>
                </div>
                <input
                  key={`cover-${inputResetKey}`}
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCover(event.target.files?.[0] ?? null)}
                  required
                />
                <small className={styles.uploadMeta}>
                  {cover ? `${cover.name} · ${formatFileSize(cover)}` : "Artwork becomes the visual identity across the app."}
                </small>
              </label>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.infoRail}>
        <div className={styles.infoItem}>
          <strong>Locked audio</strong>
          <span>After upload, you can edit the song card details, but the audio file stays fixed.</span>
        </div>
        <div className={styles.infoItem}>
          <strong>Visibility control</strong>
          <span>Public appears across discovery, while unlisted and private stay more controlled.</span>
        </div>
        <div className={styles.infoItem}>
          <strong>Studio ready</strong>
          <span>Use the tracks page after upload to rename the song, change the image, or delete it.</span>
        </div>
      </div>

      {message ? (
        <p className={`${styles.message} ${messageTone === "error" ? styles.error : styles.success}`}>
          {messageTone === "success" ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}
          <span>{message}</span>
        </p>
      ) : null}

      <div className={styles.footerBar}>
        <div className={styles.footerCopy}>
          <strong>Ready to send it?</strong>
          <span>Double-check the title, artist credit, visibility, and both files before uploading.</span>
        </div>
        <button className={styles.button} type="submit" disabled={pending || !audio || !cover}>
          {pending ? (
            <>
              <LoaderCircle size={16} className={styles.spinner} />
              <span>Uploading...</span>
            </>
          ) : (
            "Upload song"
          )}
        </button>
      </div>
    </form>
  );
}
