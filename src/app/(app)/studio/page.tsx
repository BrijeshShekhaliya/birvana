import { redirect } from "next/navigation";
import { getCreatorAccessState } from "@/lib/auth/account-state";
import { getCurrentUser } from "@/lib/data";
import { StudioAccessGate } from "@/components/studio/StudioAccessGate";

export default async function StudioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <StudioAccessGate email={user.email ?? "listener@birvana.app"} creatorAccess={getCreatorAccessState(user)} />;
}
