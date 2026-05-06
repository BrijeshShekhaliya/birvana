import styles from "./page.module.css";
import { StudioNav } from "@/components/studio/StudioNav";
import { StudioTracksWorkspace } from "@/components/studio/StudioTracksWorkspace";
import { getCurrentUser, getStudioTracks } from "@/lib/data";

export default async function StudioTracksPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const tracks = await getStudioTracks(user.id);

  return (
    <div className={styles.page}>
      <StudioNav />
      <StudioTracksWorkspace tracks={tracks} />
    </div>
  );
}
