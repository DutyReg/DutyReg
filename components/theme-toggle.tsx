"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/icons";
import {
  applyTheme,
  DEFAULT_THEME_SNAPSHOT,
  getThemeSnapshot,
  subscribeTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

export function ThemeToggle() {
  const { dark } = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => DEFAULT_THEME_SNAPSHOT,
  );

  function toggle() {
    const next = !dark;
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70"
    >
      {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}
