import styles from "./page.module.css";
import { getCreatorAccessState } from "@/lib/auth/account-state";
import { StudioAccessGate } from "@/components/studio/StudioAccessGate";
import { StudioNav } from "@/components/studio/StudioNav";
import { StudioTracksWorkspace } from "@/components/studio/StudioTracksWorkspace";
import { getCurrentUser, getStudioTracks } from "@/lib/data";

export default async function StudioTracksPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const creatorAccess = getCreatorAccessState(user);

  if (!creatorAccess.isApproved) {
    return <StudioAccessGate email={user.email ?? "listener@birvana.app"} creatorAccess={creatorAccess} />;
  }

  const tracks = await getStudioTracks(user.id);

  return (
    <div className={styles.page}>
      <StudioNav />
      <StudioTracksWorkspace tracks={tracks} />
    </div>
  );
}
