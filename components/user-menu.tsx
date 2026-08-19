"use client";

import { useEffect, useRef, useState } from "react";
import { useSyncExternalStore } from "react";

import { signOut } from "@/app/actions/auth";
import { ChevronDownIcon, LogOutIcon, SunIcon } from "@/components/icons";
import {
  applyTheme,
  DEFAULT_THEME_SNAPSHOT,
  getThemeSnapshot,
  subscribeTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    if (initials) return initials;
  }
  const local = email?.split("@")[0] ?? "";
  if (local) return local.slice(0, 2).toUpperCase();
  return "·";
}

export function UserMenu({
  email,
  name,
}: {
  email: string | null;
  name?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { override: overrideActive } = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => DEFAULT_THEME_SNAPSHOT,
  );

  function resetToSystem() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-11 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-ink transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70"
      >
        <span className="grid size-8 select-none place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-ink-soft dark:bg-zinc-800 dark:text-zinc-200">
          {initialsOf(name, email)}
        </span>
        <ChevronDownIcon
          size={16}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-lg shadow-zinc-950/5"
        >
          <div className="grid gap-0.5 px-4 py-3">
            {name ? (
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
            ) : null}
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <div className="h-px bg-border" />
          {overrideActive ? (
            <button
              type="button"
              role="menuitem"
              onClick={resetToSystem}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70"
            >
              <SunIcon size={18} className="text-muted" />
              Use system setting
            </button>
          ) : null}
          <div className="h-px bg-border" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70"
            >
              <LogOutIcon size={18} className="text-muted" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
