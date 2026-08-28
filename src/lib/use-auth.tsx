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
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirm?: boolean }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);

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
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
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

      // Confirm-email enabled → no session until link clicked.
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

  const signOut = useCallback(async () => {
    clearLocalData();
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
      signUpWithPassword,
      signInWithPassword,
      signOut,
    }),
    [
      configured,
      ready,
      session,
      signUpWithPassword,
      signInWithPassword,
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
