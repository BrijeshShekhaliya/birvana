import styles from "./page.module.css";
import { getCreatorAccessState } from "@/lib/auth/account-state";
import { CreatePlaylistForm } from "@/components/studio/CreatePlaylistForm";
import { StudioAccessGate } from "@/components/studio/StudioAccessGate";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlaylistCard } from "@/components/shared/PlaylistCard";
import { StudioNav } from "@/components/studio/StudioNav";
import { getCurrentUser, getStudioPlaylists } from "@/lib/data";

export default async function StudioPlaylistsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const creatorAccess = getCreatorAccessState(user);

  if (!creatorAccess.isApproved) {
    return <StudioAccessGate email={user.email ?? "listener@birvana.app"} creatorAccess={creatorAccess} />;
  }

  const playlists = await getStudioPlaylists(user.id);

  return (
    <div className={styles.page}>
      <StudioNav />

      <div className={styles.workspace}>
        <section className={styles.formColumn}>
          <CreatePlaylistForm />
        </section>

        <section className={styles.libraryColumn}>
          <div className={styles.collectionHeader}>
            <div>
              <p className={styles.collectionEyebrow}>Your collection</p>
              <h1 className={styles.collectionTitle}>Playlists you are building</h1>
            </div>
            <p className={styles.collectionMeta}>{playlists.length} total</p>
          </div>

          {playlists.length ? (
            <div className={styles.list}>
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} size="library" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No studio playlists yet"
              description="Create a playlist here to start organizing your catalog."
            />
          )}
        </section>
      </div>
    </div>
  );
}
