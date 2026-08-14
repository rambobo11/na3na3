"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    (async () => {
      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Hash-based fallback (implicit)
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
        }
        router.replace("/account");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auth failed");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 text-sm text-[var(--muted)]">
      {error ?? "Signing in…"}
    </div>
  );
}
