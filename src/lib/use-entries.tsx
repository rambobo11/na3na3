"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addEntries,
  average,
  countToday,
  dailyTotals,
  loadOwnerId,
  loadEntries,
  removeLastEntry,
  saveOwnerId,
  saveEntries,
} from "@/lib/store";
import {
  deleteRemoteEntry,
  fetchRemoteEntries,
  insertRemoteEntries,
  mergeLocalIntoRemote,
} from "@/lib/supabase/sync";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/use-auth";
import type { Entry } from "@/lib/types";

type SyncStatus = "local" | "syncing" | "synced" | "error";

type EntriesContextValue = {
  ready: boolean;
  entries: Entry[];
  today: number;
  avg7: number;
  syncStatus: SyncStatus;
  add: (count?: number) => void;
  undo: () => void;
  refreshFromCloud: () => Promise<void>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const userId = user?.id ?? null;

  useEffect(() => {
    setEntries(loadEntries());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveEntries(entries);
  }, [entries, ready]);

  const refreshFromCloud = useCallback(async () => {
    if (!userId) return;
    setSyncStatus("syncing");
    try {
      const owner = loadOwnerId();
      const next =
        owner && owner !== userId
          ? await fetchRemoteEntries(userId)
          : await mergeLocalIntoRemote(userId, entriesRef.current);
      saveOwnerId(userId);
      setEntries(next);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    if (!authReady || !ready) return;
    if (!userId) {
      setSyncStatus("local");
      return;
    }

    let cancelled = false;
    const supabase = getSupabase();

    (async () => {
      setSyncStatus("syncing");
      try {
        const owner = loadOwnerId();
        const next =
          owner && owner !== userId
            ? await fetchRemoteEntries(userId)
            : await mergeLocalIntoRemote(userId, entriesRef.current);
        saveOwnerId(userId);
        if (!cancelled) {
          setEntries(next);
          setSyncStatus("synced");
        }
      } catch {
        if (!cancelled) setSyncStatus("error");
      }
    })();

    if (!supabase) return;

    const channel = supabase
      .channel(`entries:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          try {
            const remote = await fetchRemoteEntries(userId);
            if (!cancelled) {
              setEntries(remote);
              setSyncStatus("synced");
            }
          } catch {
            if (!cancelled) setSyncStatus("error");
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [authReady, ready, userId]);

  const add = useCallback(
    (count = 1) => {
      const before = entriesRef.current;
      const next = addEntries(before, count);
      const added = next.slice(before.length);
      setEntries(next);

      if (userId) {
        void insertRemoteEntries(userId, added).catch(() => {
          setSyncStatus("error");
        });
      }
    },
    [userId],
  );

  const undo = useCallback(() => {
    const { entries: next, removed } = removeLastEntry(entriesRef.current);
    if (!removed) return;
    setEntries(next);

    if (userId) {
      void deleteRemoteEntry(removed.id).catch(() => {
        setSyncStatus("error");
      });
    }
  }, [userId]);

  const today = useMemo(() => countToday(entries), [entries]);
  const avg7 = useMemo(() => average(dailyTotals(entries, 7)), [entries]);

  const value = useMemo(
    () => ({
      ready: ready && authReady,
      entries,
      today,
      avg7,
      syncStatus,
      add,
      undo,
      refreshFromCloud,
    }),
    [
      ready,
      authReady,
      entries,
      today,
      avg7,
      syncStatus,
      add,
      undo,
      refreshFromCloud,
    ],
  );

  return (
    <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>
  );
}

export function useEntries(): EntriesContextValue {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useEntries must be used within EntriesProvider");
  return ctx;
}
