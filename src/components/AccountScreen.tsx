"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

export function AccountScreen() {
  const { configured, ready, user, signInWithEmail, signOut } = useAuth();
  const { syncStatus, refreshFromCloud } = useEntries();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await signInWithEmail(email);
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage("Check your email for the login link.");
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Sync
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Same account on Mac and phone
        </p>
      </header>

      {!configured ? (
        <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
          <p>Supabase is not configured yet.</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create a free project on supabase.com</li>
            <li>
              Run <code className="text-[var(--fg)]">supabase/schema.sql</code>{" "}
              in the SQL Editor
            </li>
            <li>
              Copy URL + anon key into{" "}
              <code className="text-[var(--fg)]">.env.local</code>
            </li>
            <li>
              Auth → URL config: add your site URL and{" "}
              <code className="text-[var(--fg)]">/auth/callback</code>
            </li>
          </ol>
        </div>
      ) : !ready ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : user ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Signed in
            </p>
            <p className="mt-1 break-all text-[var(--fg)]">{user.email}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Status:{" "}
              <span className="text-[var(--fg)]">
                {syncStatus === "synced"
                  ? "synced"
                  : syncStatus === "syncing"
                    ? "syncing…"
                    : syncStatus === "error"
                      ? "sync error"
                      : "local only"}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void refreshFromCloud()}
              className="rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--fg)]"
            >
              Sync now
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full px-5 py-3 text-sm text-[var(--muted)]"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3.5 text-[var(--accent-fg)] disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>
          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              No password. Open the link on each device once.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
