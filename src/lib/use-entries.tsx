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
  filterByKind,
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
import type { Entry, EntryKind } from "@/lib/types";

type SyncStatus = "local" | "syncing" | "synced" | "error";

type EntriesContextValue = {
  ready: boolean;
  entries: Entry[];
  today: number;
  avg7: number;
  todayCha7et: number;
  avg7Cha7et: number;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastError: string | null;
  add: (count?: number, kind?: EntryKind) => void;
  undo: (kind?: EntryKind) => void;
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
  /** Ids recently written/deleted — survive brief cloud read lag. */
  const recentInsertsRef = useRef(new Map<string, Entry>());
  const recentDeletesRef = useRef(new Map<string, number>());

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

  const composeFromRemote = useCallback((remote: Entry[]): Entry[] => {
    const now = Date.now();
    for (const [id, ts] of recentDeletesRef.current) {
      if (now - ts > 8000) recentDeletesRef.current.delete(id);
    }
    for (const [id] of recentInsertsRef.current) {
      if (remote.some((r) => r.id === id)) recentInsertsRef.current.delete(id);
    }

    let next = applyPendingToEntries(remote, queueRef.current);

    // Keep optimistic inserts until they appear in cloud.
    for (const [id, entry] of recentInsertsRef.current) {
      if (!next.some((e) => e.id === id)) next = [...next, entry];
    }

    // Force-apply recent deletes (cloud may lag).
    if (recentDeletesRef.current.size > 0) {
      next = next.filter((e) => !recentDeletesRef.current.has(e.id));
    }

    return next.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  }, []);

  const pullFromCloud = useCallback(
    async (uid: string) => {
      const remote = await fetchRemoteEntries(uid);
      const next = composeFromRemote(remote);
      setEntries(next);
      saveOwnerId(uid);
    },
    [composeFromRemote],
  );

  const flushQueue = useCallback(async (uid: string): Promise<boolean> => {
    let ok = true;
    const run = async () => {
      if (queueRef.current.length === 0) return;
      setSyncStatus("syncing");
      try {
        let ops = queueRef.current;
        while (ops.length > 0) {
          const [head, ...rest] = ops;
          if (head.type === "insert") {
            await insertRemoteEntries(uid, [head.entry]);
            recentInsertsRef.current.set(head.entry.id, head.entry);
          } else {
            await deleteRemoteEntry(head.id);
            recentDeletesRef.current.set(head.id, Date.now());
            recentInsertsRef.current.delete(head.id);
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

  const syncWithCloud = useCallback(
    async (uid: string, opts?: { replaceLocal?: boolean }) => {
      setSyncStatus("syncing");
      try {
        if (opts?.replaceLocal) {
          clearQueue();
          queueRef.current = [];
          setQueue([]);
          recentInsertsRef.current.clear();
          recentDeletesRef.current.clear();
          seededRef.current = true;
          await pullFromCloud(uid);
          setLastError(null);
          setSyncStatus("synced");
          return;
        }

        await flushQueue(uid);

        if (!seededRef.current) {
          const remote = await fetchRemoteEntries(uid);
          if (remote.length === 0 && entriesRef.current.length > 0) {
            await seedLocalIntoRemote(
              uid,
              entriesRef.current,
              loadDeletedIds(),
            );
          }
          seededRef.current = true;
        }

        await pullFromCloud(uid);
        setLastError(null);
        setSyncStatus(queueRef.current.length > 0 ? "error" : "synced");
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

  // Auth / bootstrap + realtime (stable deps: only userId/authReady/ready).
  useEffect(() => {
    if (!authReady || !ready) return;

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev && !userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      recentInsertsRef.current.clear();
      recentDeletesRef.current.clear();
      seededRef.current = false;
      setSyncStatus("local");
      return;
    }

    if (prev && userId && prev !== userId) {
      clearLocalData();
      setEntries([]);
      setQueue([]);
      recentInsertsRef.current.clear();
      recentDeletesRef.current.clear();
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
        () => {
          if (cancelled) return;
          void pullFromCloud(userId)
            .then(() => {
              if (queueRef.current.length === 0) {
                setLastError(null);
                setSyncStatus("synced");
              }
            })
            .catch((e) => {
              setLastError(errorMessage(e));
              setSyncStatus("error");
            });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only rebind on auth identity
  }, [authReady, ready, userId]);

  // Background flush + pull while signed in (does not wipe optimistic ops).
  useEffect(() => {
    if (!userId) return;

    const softPull = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void flushQueue(userId)
        .then(async () => {
          await pullFromCloud(userId);
          if (queueRef.current.length === 0) {
            setLastError(null);
            setSyncStatus("synced");
          }
        })
        .catch((e) => {
          setLastError(errorMessage(e));
          setSyncStatus("error");
        });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") softPull();
    };

    window.addEventListener("online", softPull);
    window.addEventListener("focus", softPull);
    document.addEventListener("visibilitychange", onVisibility);

    // Soft pull + retry pending queue often enough that manual Sync is rare.
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (queueRef.current.length > 0) {
        void flushQueue(userId).then((ok) => {
          if (ok) {
            void pullFromCloud(userId).catch(() => {
              /* keep optimistic local state */
            });
          }
        });
        return;
      }
      void pullFromCloud(userId).catch(() => {
        /* keep optimistic local state on transient errors */
      });
    }, 2500);

    return () => {
      window.removeEventListener("online", softPull);
      window.removeEventListener("focus", softPull);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [userId, flushQueue, pullFromCloud]);

  // Extra backoff retry after a failed flush with pending ops.
  useEffect(() => {
    if (!userId || queue.length === 0 || syncStatus !== "error") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const t = window.setTimeout(() => {
      void flushQueue(userId);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [userId, queue.length, syncStatus, flushQueue]);

  const add = useCallback(
    (count = 1, kind: EntryKind = "na3") => {
      const before = entriesRef.current;
      const next = addEntries(before, count, kind);
      const added = next.slice(before.length);
      for (const entry of added) {
        recentInsertsRef.current.set(entry.id, entry);
        recentDeletesRef.current.delete(entry.id);
      }
      setEntries(next);

      if (!userId) return;

      const ops = enqueueInserts(queueRef.current, added);
      queueRef.current = ops;
      setQueue(ops);
      void flushQueue(userId);
    },
    [userId, flushQueue],
  );

  const undo = useCallback(
    (kind: EntryKind = "na3") => {
      const { entries: next, removed } = removeLastEntry(
        entriesRef.current,
        kind,
      );
      if (!removed) return;

      rememberDeletedId(removed.id);
      recentDeletesRef.current.set(removed.id, Date.now());
      recentInsertsRef.current.delete(removed.id);
      setEntries(next);

      if (!userId) return;

      const ops = enqueueDelete(queueRef.current, removed.id);
      queueRef.current = ops;
      setQueue(ops);
      void flushQueue(userId);
    },
    [userId, flushQueue],
  );

  const na3Entries = useMemo(() => filterByKind(entries, "na3"), [entries]);
  const cha7etEntries = useMemo(
    () => filterByKind(entries, "cha7et"),
    [entries],
  );
  const today = useMemo(() => countToday(na3Entries), [na3Entries]);
  const avg7 = useMemo(
    () => average(dailyTotals(na3Entries, 7)),
    [na3Entries],
  );
  const todayCha7et = useMemo(() => countToday(cha7etEntries), [cha7etEntries]);
  const avg7Cha7et = useMemo(
    () => average(dailyTotals(cha7etEntries, 7)),
    [cha7etEntries],
  );

  const value = useMemo(
    () => ({
      ready: ready && authReady,
      entries,
      today,
      avg7,
      todayCha7et,
      avg7Cha7et,
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
      todayCha7et,
      avg7Cha7et,
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
