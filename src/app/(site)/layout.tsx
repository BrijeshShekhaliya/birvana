import type { ReactNode } from "react";
import { PublicThemeSync } from "@/components/shared/PublicThemeSync";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicThemeSync />
      {children}
    </>
  );
}
