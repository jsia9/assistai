"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { migrateLegacyStorage } from "@/lib/legacyMigration";

export function Providers({ children }: { children: React.ReactNode }) {
  // Run legacy key migration once on first mount
  useEffect(() => {
    migrateLegacyStorage();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
