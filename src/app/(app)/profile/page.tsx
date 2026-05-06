import { redirect } from "next/navigation";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { getCurrentUser, getProfileOverview } from "@/lib/data";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const overview = await getProfileOverview(user.id);

  return <ProfileWorkspace overview={overview} email={user.email ?? "Listener"} />;
}
