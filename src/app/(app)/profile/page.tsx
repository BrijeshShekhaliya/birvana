import { redirect } from "next/navigation";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { getCreatorAccessState, getFollowedArtistIds } from "@/lib/auth/account-state";
import { getCurrentUser, getProfileOverview } from "@/lib/data";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const overview = await getProfileOverview(user.id);
  const creatorAccess = getCreatorAccessState(user);
  const followedArtistCount = getFollowedArtistIds(user).length;

  return (
    <ProfileWorkspace
      overview={overview}
      email={user.email ?? "Listener"}
      creatorAccess={creatorAccess}
      followedArtistCount={followedArtistCount}
    />
  );
}
