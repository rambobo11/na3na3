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
  clearLocalData,
  countToday,
  dailyTotals,
  loadOwnerId,
  loadEntries,
  removeLastEntry,
  saveOwnerId,
  saveEntries,
} from "@/lib/store";
import {
  applyPendingToEntries,
  clearQueue,
  enqueueDelete,
  enqueueInserts,
  loadQueue,
  saveQueue,
  type PendingOp,
} from "@/lib/sync-queue";
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
  pendingCount: number;
  lastError: string | null;
  add: (count?: number) => void;
  undo: () => void;
  refreshFromCloud: () => Promise<void>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [queue, setQueue] = useState<PendingOp[]>([]);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [lastError, setLastError] = useState<string | null>(null);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const flushingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    setEntries(loadEntries());
    setQueue(loadQueue());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveEntries(entries);
  }, [entries, ready]);

  useEffect(() => {
    if (!ready) return;
    saveQueue(queue);
  }, [queue, ready]);

  const flushQueue = useCallback(async (uid: string): Promise<boolean> => {
    if (flushingRef.current) return false;
    flushingRef.current = true;
    setSyncStatus("syncing");

    try {
      let ops = queueRef.current;
      while (ops.length > 0) {
        const [head, ...rest] = ops;
        if (head.type === "insert") {
          await insertRemoteEntries(uid, [head.entry]);
        } else {
          await deleteRemoteEntry(head.id);
        }
        ops = rest;
        queueRef.current = ops;
        setQueue(ops);
        saveQueue(ops);
      }
      setLastError(null);
      setSyncStatus("synced");
      return true;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Sync failed");
      setSyncStatus("error");
      return false;
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const syncWithCloud = useCallback(
    async (uid: string, opts?: { replaceLocal?: boolean }) => {
      setSyncStatus("syncing");
      try {
        if (opts?.replaceLocal) {
          clearQueue();
          queueRef.current = [];
          setQueue([]);
          const remote = await fetchRemoteEntries(uid);
          setEntries(remote);
          saveOwnerId(uid);
          setLastError(null);
          setSyncStatus("synced");
          return;
        }

        await flushQueue(uid);

        const merged = await mergeLocalIntoRemote(uid, entriesRef.current);
        const withPending = applyPendingToEntries(merged, queueRef.current);
        setEntries(withPending);
        saveOwnerId(uid);
        if (queueRef.current.length > 0) {
          setSyncStatus("error");
        } else {
          setLastError(null);
          setSyncStatus("synced");
        }
      } catch (e) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : e instanceof Error
              ? e.message
              : "Sync failed";
        setLastError(msg);
        setSyncStatus("error");
      }
    },
    [flushQueue],
  );

  const refreshFromCloud = useCallback(async () => {
    if (!userId) return;
    await syncWithCloud(userId);
  }, [userId, syncWithCloud]);

  // Sign-out / account switch: wipe local privacy-sensitive cache.
  useEffect(() => {
    if (!authReady || !ready) return;

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev && !userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      setSyncStatus("local");
      return;
    }

    if (prev && userId && prev !== userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      void syncWithCloud(userId, { replaceLocal: true });
      return;
    }

    if (!userId) {
      setSyncStatus("local");
      return;
    }

    let cancelled = false;
    const supabase = getSupabase();

    (async () => {
      const owner = loadOwnerId();
      if (cancelled) return;
      if (owner && owner !== userId) {
        await syncWithCloud(userId, { replaceLocal: true });
      } else {
        await syncWithCloud(userId);
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
            if (cancelled) return;
            const next = applyPendingToEntries(remote, queueRef.current);
            setEntries(next);
            if (queueRef.current.length === 0) setSyncStatus("synced");
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
  }, [authReady, ready, userId, syncWithCloud]);

  // Retry queue when back online / tab focused.
  useEffect(() => {
    if (!userId) return;

    const retry = () => {
      if (queueRef.current.length === 0) return;
      void flushQueue(userId);
    };

    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [userId, flushQueue]);

  const add = useCallback(
    (count = 1) => {
      const before = entriesRef.current;
      const next = addEntries(before, count);
      const added = next.slice(before.length);
      setEntries(next);

      if (!userId) return;

      const ops = enqueueInserts(queueRef.current, added);
      queueRef.current = ops;
      setQueue(ops);
      void flushQueue(userId);
    },
    [userId, flushQueue],
  );

  const undo = useCallback(() => {
    const { entries: next, removed } = removeLastEntry(entriesRef.current);
    if (!removed) return;
    setEntries(next);

    if (!userId) return;

    const ops = enqueueDelete(queueRef.current, removed.id);
    queueRef.current = ops;
    setQueue(ops);
    void flushQueue(userId);
  }, [userId, flushQueue]);

  const today = useMemo(() => countToday(entries), [entries]);
  const avg7 = useMemo(() => average(dailyTotals(entries, 7)), [entries]);

  const value = useMemo(
    () => ({
      ready: ready && authReady,
      entries,
      today,
      avg7,
      syncStatus,
      pendingCount: queue.length,
      lastError,
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
      queue.length,
      lastError,
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
