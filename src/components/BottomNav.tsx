"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

export function BottomNav() {
  const pathname = usePathname();
  const { user, configured } = useAuth();
  const { pendingCount, syncStatus } = useEntries();

  const syncNeedsAttention =
    Boolean(user) && (pendingCount > 0 || syncStatus === "error");

  const links = [
    { href: "/", label: "Home" },
    { href: "/stats", label: "Stats" },
    {
      href: "/account",
      label: configured && !user ? "Login" : "Sync",
    },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--bg)]/92 backdrop-blur-md"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md items-stretch px-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          const showDot = href === "/account" && syncNeedsAttention;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-12 flex-1 items-center justify-center py-3 text-[15px] tracking-wide transition-colors ${
                active
                  ? "text-[var(--fg)] font-semibold"
                  : "text-[var(--muted)] active:text-[var(--fg)]"
              }`}
            >
              {label}
              {showDot ? (
                <span
                  className="absolute right-[calc(50%-1.6rem)] top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
