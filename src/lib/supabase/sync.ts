import type { Entry } from "@/lib/types";
import { normalizeKind } from "@/lib/types";
import { getSupabase } from "./client";

type EntryRow = {
  id: string;
  logged_at: string;
  user_id: string;
  kind?: string | null;
};

export function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    kind: normalizeKind(row.kind),
  };
}

export async function fetchRemoteEntries(userId: string): Promise<Entry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const withKind = await supabase
    .from("entries")
    .select("id, logged_at, user_id, kind")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });

  if (!withKind.error) {
    return (withKind.data as EntryRow[] | null)?.map(rowToEntry) ?? [];
  }

  // Pre-migration DBs without `kind` column.
  const legacy = await supabase
    .from("entries")
    .select("id, logged_at, user_id")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });
  if (legacy.error) throw withKind.error;
  return (legacy.data as EntryRow[] | null)?.map(rowToEntry) ?? [];
}

export async function insertRemoteEntries(
  userId: string,
  entries: Entry[],
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("entries").insert(
    entries.map((s) => ({
      id: s.id,
      logged_at: s.loggedAt,
      user_id: userId,
      kind: s.kind,
    })),
  );
  // Idempotent flush: duplicate primary key means already synced
  if (error && error.code !== "23505") throw error;
}

export async function deleteRemoteEntry(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

/**
 * One-time seed: upload local rows missing remotely (never re-upload tombstones).
 * Used only when remote is empty / first login.
 */
export async function seedLocalIntoRemote(
  userId: string,
  local: Entry[],
  deletedIds: Set<string>,
): Promise<Entry[]> {
  const remote = await fetchRemoteEntries(userId);
  const remoteIds = new Set(remote.map((s) => s.id));
  const missing = local.filter(
    (s) => !remoteIds.has(s.id) && !deletedIds.has(s.id),
  );
  if (missing.length > 0) {
    await insertRemoteEntries(userId, missing);
  }
  return fetchRemoteEntries(userId);
}
