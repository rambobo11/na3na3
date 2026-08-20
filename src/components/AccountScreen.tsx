"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { friendlyAuthError } from "@/lib/auth-errors";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

export function AccountScreen() {
  const searchParams = useSearchParams();
  const {
    configured,
    ready,
    user,
    signInWithEmail,
    verifyEmailOtp,
    signOut,
  } = useAuth();
  const { syncStatus, pendingCount, lastError, refreshFromCloud, entries } =
    useEntries();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setMessage("Sign-in link expired or invalid. Use the email code instead.");
      setAwaitingCode(true);
    }
  }, [searchParams]);

  async function sendCode() {
    setBusy(true);
    setMessage(null);
    const { error } = await signInWithEmail(email);
    setBusy(false);
    if (error) {
      setMessage(friendlyAuthError(error));
      return;
    }
    setAwaitingCode(true);
    setMessage("Check your email for a 6-digit code (best on iPhone app).");
  }

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function onVerifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await verifyEmailOtp(email, code);
    setBusy(false);
    if (error) {
      setMessage(friendlyAuthError(error));
      return;
    }
    setCode("");
    setAwaitingCode(false);
    setMessage(null);
  }

  async function onSyncNow() {
    setSyncing(true);
    await refreshFromCloud();
    setSyncing(false);
  }

  return (
    <div className="app-screen mx-auto flex max-w-md flex-col">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Login
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Enter your email to sync Mac and iPhone
        </p>
      </header>

      {!configured ? (
        <div className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          <p className="text-[var(--fg)]">
            Login is unavailable: Supabase keys are missing on Vercel.
          </p>
          <p>
            In Vercel → Project → Settings → Environment Variables, add both
            for <span className="text-[var(--fg)]">Production</span>, then
            Redeploy:
          </p>
          <ul className="list-disc space-y-2 pl-5 font-mono text-xs text-[var(--fg)]">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
          <p>
            After redeploy, reopen the app and you will see the email field
            here.
          </p>
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
            <div className="mt-3">
              <SyncBadge />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Entries:{" "}
              <span className="text-[var(--fg)]">{entries.length}</span>
              {pendingCount > 0 ? (
                <>
                  {" · "}
                  <span className="text-[var(--fg)]">
                    {pendingCount} waiting to sync
                  </span>
                </>
              ) : null}
            </p>
            {lastError ? (
              <p className="mt-3 text-sm text-red-500 break-words">{lastError}</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Changes sync automatically when online. Sync now is only needed
                if something sticks on pending.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void onSyncNow()}
              disabled={syncing || syncStatus === "syncing"}
              className="rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--fg)] disabled:opacity-50"
            >
              {syncStatus === "error" || pendingCount > 0
                ? "Retry sync"
                : "Sync now"}
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
      ) : awaitingCode ? (
        <form onSubmit={onVerifyCode} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Code sent to <span className="text-[var(--fg)]">{email}</span>
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
              6-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-center text-2xl tracking-[0.35em] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              placeholder="000000"
            />
          </label>
          <button
            type="submit"
            disabled={busy || code.trim().length < 6}
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3.5 text-[var(--accent-fg)] disabled:opacity-60"
          >
            {busy ? "Checking…" : "Confirm code"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendCode()}
            className="w-full rounded-full px-5 py-3 text-sm text-[var(--muted)]"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaitingCode(false);
              setCode("");
              setMessage(null);
            }}
            className="w-full rounded-full px-5 py-2 text-sm text-[var(--muted)]"
          >
            Change email
          </button>
          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
        </form>
      ) : (
        <form onSubmit={onSendCode} className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            On iPhone, enter the email code in this app — don’t rely on the
            magic link (Safari and the home-screen app don’t share login).
          </p>
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
            {busy ? "Sending…" : "Send code"}
          </button>
          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
