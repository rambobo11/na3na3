"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { friendlyAuthError } from "@/lib/auth-errors";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

type Mode = "signin" | "signup" | "forgot" | "newpassword";

export function AccountScreen() {
  const searchParams = useSearchParams();
  const {
    configured,
    ready,
    user,
    recoveryMode,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
    signOut,
  } = useAuth();
  const { syncStatus, pendingCount, lastError, refreshFromCloud, entries } =
    useEntries();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setMessage("Sign-in link failed. Use email + password instead.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (recoveryMode) {
      setMode("newpassword");
      setMessage("Choose a new password for this account.");
    }
  }, [recoveryMode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setBusy(false);
        setMessage("Enter your email first.");
        return;
      }
      const { error } = await resetPassword(email);
      setBusy(false);
      if (error) {
        setMessage(friendlyAuthError(error));
        return;
      }
      setMessage(
        "Check your email for a reset link. Open it, then set a new password here.",
      );
      return;
    }

    if (mode === "newpassword") {
      if (password.length < 6) {
        setBusy(false);
        setMessage("Password must be at least 6 characters.");
        return;
      }
      const { error } = await updatePassword(password);
      setBusy(false);
      if (error) {
        setMessage(friendlyAuthError(error));
        return;
      }
      setPassword("");
      setMode("signin");
      setMessage("Password updated. You’re signed in — sync is ready.");
      return;
    }

    if (password.length < 6) {
      setBusy(false);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signin") {
      const { error } = await signInWithPassword(email, password);
      setBusy(false);
      if (error) setMessage(friendlyAuthError(error));
      return;
    }

    const { error, needsEmailConfirm } = await signUpWithPassword(
      email,
      password,
    );
    setBusy(false);
    if (error) {
      setMessage(friendlyAuthError(error));
      if (error.toLowerCase().includes("already")) {
        setMode("signin");
      }
      return;
    }
    if (needsEmailConfirm) {
      setMessage(
        "Account created. Confirm the email link once, then Sign in with this password.",
      );
      setMode("signin");
    }
  }

  async function onSyncNow() {
    setSyncing(true);
    await refreshFromCloud();
    setSyncing(false);
  }

  const showAuthForm = !user || mode === "newpassword";

  return (
    <div className="app-screen mx-auto flex max-w-md flex-col">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Login
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Same email + password on Mac and iPhone to sync
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
        </div>
      ) : !ready ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : user && mode !== "newpassword" ? (
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
            {message ? (
              <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
            ) : null}
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
      ) : showAuthForm ? (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {mode !== "newpassword" && mode !== "forgot" ? (
            <div className="flex rounded-full border border-[var(--border)] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMessage(null);
                }}
                className={`flex-1 rounded-full py-2 text-sm ${
                  mode === "signin"
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "text-[var(--muted)]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage(null);
                }}
                className={`flex-1 rounded-full py-2 text-sm ${
                  mode === "signup"
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "text-[var(--muted)]"
                }`}
              >
                Create account
              </button>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {mode === "forgot"
              ? "We’ll email a reset link. Open it on this device, then pick a password."
              : mode === "newpassword"
                ? "Set the password you’ll reuse on Mac and iPhone."
                : "Same password on both devices. If Sign in fails after the old email-link login, use Forgot password."}
          </p>

          {mode !== "newpassword" ? (
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
          ) : null}

          {mode !== "forgot" ? (
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
                {mode === "newpassword" ? "New password" : "Password"}
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signup" || mode === "newpassword"
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                placeholder="••••••••"
              />
            </label>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3.5 text-[var(--accent-fg)] disabled:opacity-60"
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Save password"}
          </button>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage(null);
              }}
              className="w-full rounded-full px-5 py-2 text-sm text-[var(--muted)]"
            >
              Forgot password?
            </button>
          ) : null}

          {mode === "forgot" || mode === "newpassword" ? (
            <button
              type="button"
              onClick={() => {
                clearRecoveryMode();
                setMode("signin");
                setMessage(null);
              }}
              className="w-full rounded-full px-5 py-2 text-sm text-[var(--muted)]"
            >
              Back to Sign in
            </button>
          ) : null}

          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
