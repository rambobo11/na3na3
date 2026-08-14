import type { Entry } from "@/lib/types";

const QUEUE_KEY = "na3na3:queue";

export type PendingOp =
  | { type: "insert"; entry: Entry }
  | { type: "delete"; id: string };

export function loadQueue(): PendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingOp[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingOp);
  } catch {
    return [];
  }
}

export function saveQueue(ops: PendingOp[]): void {
  if (typeof window === "undefined") return;
  if (ops.length === 0) localStorage.removeItem(QUEUE_KEY);
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

export function clearQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}

function isPendingOp(op: unknown): op is PendingOp {
  if (!op || typeof op !== "object") return false;
  const o = op as PendingOp;
  if (o.type === "delete" && typeof o.id === "string") return true;
  if (
    o.type === "insert" &&
    o.entry &&
    typeof o.entry.id === "string" &&
    typeof o.entry.loggedAt === "string"
  ) {
    return true;
  }
  return false;
}

/** Enqueue inserts. */
export function enqueueInserts(ops: PendingOp[], entries: Entry[]): PendingOp[] {
  return [
    ...ops,
    ...entries.map((entry): PendingOp => ({ type: "insert", entry })),
  ];
}

/**
 * Enqueue a delete. If the same id is still a pending insert, cancel that
 * insert instead of hitting the server.
 */
export function enqueueDelete(ops: PendingOp[], id: string): PendingOp[] {
  const insertIdx = ops.findIndex(
    (op) => op.type === "insert" && op.entry.id === id,
  );
  if (insertIdx !== -1) {
    return [...ops.slice(0, insertIdx), ...ops.slice(insertIdx + 1)];
  }
  // Avoid duplicate delete ops for the same id
  if (ops.some((op) => op.type === "delete" && op.id === id)) return ops;
  return [...ops, { type: "delete", id }];
}

/** Apply pending ops on top of a remote snapshot (realtime-safe). */
export function applyPendingToEntries(
  remote: Entry[],
  ops: PendingOp[],
): Entry[] {
  const byId = new Map(remote.map((e) => [e.id, e]));
  for (const op of ops) {
    if (op.type === "insert") byId.set(op.entry.id, op.entry);
    else byId.delete(op.id);
  }
  return [...byId.values()].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  );
}

export function pendingIds(ops: PendingOp[]): {
  inserts: Set<string>;
  deletes: Set<string>;
} {
  const inserts = new Set<string>();
  const deletes = new Set<string>();
  for (const op of ops) {
    if (op.type === "insert") inserts.add(op.entry.id);
    else deletes.add(op.id);
  }
  return { inserts, deletes };
}
