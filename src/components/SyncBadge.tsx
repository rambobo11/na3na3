"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

type Props = {
  /** Compact pill for Home header */
  compact?: boolean;
};

export function SyncBadge({ compact = false }: Props) {
  const { configured, user } = useAuth();
  const { syncStatus, pendingCount, lastError, refreshFromCloud } =
    useEntries();
  const online = useOnline();
  const [busy, setBusy] = useState(false);

  if (!configured || !user) return null;

  let label = "synced";
  let tone: "ok" | "warn" | "bad" | "muted" = "ok";

  if (!online) {
    label = "offline";
    tone = "warn";
  } else if (syncStatus === "syncing" || busy) {
    label = "syncing…";
    tone = "muted";
  } else if (pendingCount > 0) {
    label = compact ? `pending ${pendingCount}` : `pending (${pendingCount})`;
    tone = "warn";
  } else if (syncStatus === "error") {
    label = "sync error";
    tone = "bad";
  } else if (syncStatus === "local") {
    label = "local";
    tone = "muted";
  }

  const needsAction =
    online && (pendingCount > 0 || syncStatus === "error");

  async function onRetry() {
    if (!needsAction || busy) return;
    setBusy(true);
    await refreshFromCloud();
    setBusy(false);
  }

  const className = compact
    ? `shrink-0 rounded-full px-2.5 py-1 text-xs tabular-nums ${
        tone === "ok"
          ? "text-[var(--muted)]"
          : tone === "warn"
            ? "bg-[var(--surface)] text-[var(--fg)]"
            : tone === "bad"
              ? "bg-[var(--surface)] text-red-500"
              : "text-[var(--muted)]"
      }`
    : `inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm tabular-nums ${
        tone === "bad" ? "text-red-500" : "text-[var(--fg)]"
      }`;

  if (needsAction) {
    return (
      <button
        type="button"
        onClick={() => void onRetry()}
        className={className}
        title={lastError ?? "Tap to retry sync"}
      >
        {label}
        {!compact ? " · retry" : ""}
      </button>
    );
  }

  return (
    <Link href="/account" className={className} title={lastError ?? label}>
      {label}
    </Link>
  );
}
