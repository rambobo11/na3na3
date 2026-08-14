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
  loadDeletedIds,
  loadOwnerId,
  loadEntries,
  rememberDeletedId,
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
  seedLocalIntoRemote,
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

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: string }).message);
  }
  if (e instanceof Error) return e.message;
  return "Sync failed";
}

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
  const flushChainRef = useRef(Promise.resolve());
  const prevUserIdRef = useRef<string | null>(null);
  const seededRef = useRef(false);

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
    let ok = true;
    const run = async () => {
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
        ok = true;
      } catch (e) {
        setLastError(errorMessage(e));
        setSyncStatus("error");
        ok = false;
      }
    };

    const next = flushChainRef.current.then(run, run);
    flushChainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    await next;
    return ok;
  }, []);

  const pullFromCloud = useCallback(async (uid: string) => {
    const remote = await fetchRemoteEntries(uid);
    const withPending = applyPendingToEntries(remote, queueRef.current);
    setEntries(withPending);
    saveOwnerId(uid);
  }, []);

  const syncWithCloud = useCallback(
    async (uid: string, opts?: { replaceLocal?: boolean }) => {
      setSyncStatus("syncing");
      try {
        if (opts?.replaceLocal) {
          clearQueue();
          queueRef.current = [];
          setQueue([]);
          seededRef.current = true;
          await pullFromCloud(uid);
          setLastError(null);
          setSyncStatus("synced");
          return;
        }

        await flushQueue(uid);

        // First sync for this session: seed local-only rows once if cloud empty.
        if (!seededRef.current) {
          const remote = await fetchRemoteEntries(uid);
          if (remote.length === 0 && entriesRef.current.length > 0) {
            await seedLocalIntoRemote(
              uid,
              entriesRef.current,
              loadDeletedIds(),
            );
          } else if (remote.length === 0) {
            // nothing to seed
          } else {
            // Cloud already has data — do not re-upload local orphans (would undo remote deletes).
          }
          seededRef.current = true;
        }

        await pullFromCloud(uid);
        if (queueRef.current.length > 0) {
          setSyncStatus("error");
        } else {
          setLastError(null);
          setSyncStatus("synced");
        }
      } catch (e) {
        setLastError(errorMessage(e));
        setSyncStatus("error");
      }
    },
    [flushQueue, pullFromCloud],
  );

  const refreshFromCloud = useCallback(async () => {
    if (!userId) return;
    await syncWithCloud(userId);
  }, [userId, syncWithCloud]);

  useEffect(() => {
    if (!authReady || !ready) return;

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev && !userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      seededRef.current = false;
      setSyncStatus("local");
      return;
    }

    if (prev && userId && prev !== userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      seededRef.current = false;
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
        seededRef.current = false;
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
            if (cancelled) return;
            await pullFromCloud(userId);
            if (queueRef.current.length === 0) {
              setLastError(null);
              setSyncStatus("synced");
            }
          } catch (e) {
            if (!cancelled) {
              setLastError(errorMessage(e));
              setSyncStatus("error");
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [authReady, ready, userId, syncWithCloud, pullFromCloud]);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      void flushQueue(userId).then(() => pullFromCloud(userId));
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    // Light poll while the app is open — catches DELETE when Realtime lags.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void pullFromCloud(userId);
      }
    }, 4000);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [userId, flushQueue, pullFromCloud]);

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

    rememberDeletedId(removed.id);
    const ops = enqueueDelete(queueRef.current, removed.id);
    queueRef.current = ops;
    setQueue(ops);
    void flushQueue(userId).then((ok) => {
      if (ok) void pullFromCloud(userId);
    });
  }, [userId, flushQueue, pullFromCloud]);

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
