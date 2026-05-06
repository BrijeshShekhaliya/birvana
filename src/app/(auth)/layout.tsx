import type { ReactNode } from "react";
import { PublicThemeSync } from "@/components/shared/PublicThemeSync";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicThemeSync />
      {children}
    </>
  );
}
