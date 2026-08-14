import { Suspense } from "react";
import { AccountScreen } from "@/components/AccountScreen";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <AccountScreen />
    </Suspense>
  );
}
