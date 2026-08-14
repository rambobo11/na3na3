"use client";

import { AuthProvider } from "@/lib/use-auth";
import { EntriesProvider } from "@/lib/use-entries";
import { BottomNav } from "@/components/BottomNav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EntriesProvider>
        {children}
        <BottomNav />
      </EntriesProvider>
    </AuthProvider>
  );
}
