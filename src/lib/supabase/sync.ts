import type { Entry } from "@/lib/types";
import { getSupabase } from "./client";

type EntryRow = {
  id: string;
  logged_at: string;
  user_id: string;
};

export function rowToEntry(row: EntryRow): Entry {
  return { id: row.id, loggedAt: row.logged_at };
}

export async function fetchRemoteEntries(userId: string): Promise<Entry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("entries")
    .select("id, logged_at, user_id")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true });

  if (error) throw error;
  return (data as EntryRow[] | null)?.map(rowToEntry) ?? [];
}

export async function insertRemoteEntries(
  userId: string,
  entries: Entry[],
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("entries").insert(
    entries.map((s) => ({
      id: s.id,
      logged_at: s.loggedAt,
      user_id: userId,
    })),
  );
  if (error) throw error;
}

export async function deleteRemoteEntry(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

/** Upload local-only rows, then return the merged remote list. */
export async function mergeLocalIntoRemote(
  userId: string,
  local: Entry[],
): Promise<Entry[]> {
  const remote = await fetchRemoteEntries(userId);
  const remoteIds = new Set(remote.map((s) => s.id));
  const missing = local.filter((s) => !remoteIds.has(s.id));
  if (missing.length > 0) {
    await insertRemoteEntries(userId, missing);
  }
  return fetchRemoteEntries(userId);
}
