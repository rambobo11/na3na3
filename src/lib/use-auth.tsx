"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearLocalData } from "@/lib/store";

type AuthContextValue = {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  recoveryMode: boolean;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirm?: boolean }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  clearRecoveryMode: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase is not configured." };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };

      // Empty identities = email already registered (Supabase quirk).
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return { error: "User already registered" };
      }

      if (!data.session) {
        return { error: null, needsEmailConfirm: true };
      }
      return { error: null };
    },
    [],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Supabase is not configured." };

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured." };

    const redirectTo = `${window.location.origin}/account`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured." };

    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecoveryMode(false);
    return { error: error?.message ?? null };
  }, []);

  const clearRecoveryMode = useCallback(() => setRecoveryMode(false), []);

  const signOut = useCallback(async () => {
    clearLocalData();
    setRecoveryMode(false);
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      configured,
      ready,
      session,
      user: session?.user ?? null,
      recoveryMode,
      signUpWithPassword,
      signInWithPassword,
      resetPassword,
      updatePassword,
      clearRecoveryMode,
      signOut,
    }),
    [
      configured,
      ready,
      session,
      recoveryMode,
      signUpWithPassword,
      signInWithPassword,
      resetPassword,
      updatePassword,
      clearRecoveryMode,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
