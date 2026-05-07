import styles from "./page.module.css";
import { StudioAccessGate } from "@/components/studio/StudioAccessGate";
import { getCreatorAccessState } from "@/lib/auth/account-state";
import { StudioNav } from "@/components/studio/StudioNav";
import { UploadSongForm } from "@/components/studio/UploadSongForm";
import { getCurrentUser } from "@/lib/data";

export default async function StudioUploadPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const creatorAccess = getCreatorAccessState(user);

  if (!creatorAccess.isApproved) {
    return <StudioAccessGate email={user.email ?? "listener@birvana.app"} creatorAccess={creatorAccess} />;
  }

  return (
    <div className={styles.page}>
      <StudioNav />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>Studio upload</p>
          <h1 className={styles.heroTitle}>Upload the song once, then manage it cleanly in Studio.</h1>
          <p className={styles.copy}>
            Set the release details, choose who can see it, and send the audio and artwork in one
            pass. After upload, the tracks page becomes the place for edits and cleanup.
          </p>
        </div>

        <div className={styles.heroHighlights}>
          <div className={styles.highlightCard}>
            <span className={styles.highlightLabel}>One flow</span>
            <strong className={styles.highlightValue}>Credits + files</strong>
            <span className={styles.highlightMeta}>Everything needed before the release goes live.</span>
          </div>
          <div className={styles.highlightCard}>
            <span className={styles.highlightLabel}>Studio flow</span>
            <strong className={styles.highlightValue}>Upload, then manage</strong>
            <span className={styles.highlightMeta}>Titles, images, and visibility stay editable after release.</span>
          </div>
        </div>
      </section>
      <UploadSongForm />
    </div>
  );
}
