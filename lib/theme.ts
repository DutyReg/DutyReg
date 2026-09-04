export const THEME_STORAGE_KEY = "daymark-theme";

export const LIGHT_THEME_COLOR = "#f8fbff";
export const DARK_THEME_COLOR = "#0a0f12";

interface ThemeSnapshot {
  dark: boolean;
  override: boolean;
}

export const DEFAULT_THEME_SNAPSHOT: ThemeSnapshot = { dark: false, override: false };

const listeners = new Set<() => void>();
let cached: ThemeSnapshot | null = null;

function computeSnapshot(): ThemeSnapshot {
  const dark = document.documentElement.classList.contains("dark");
  const override = localStorage.getItem(THEME_STORAGE_KEY) !== null;
  if (cached && cached.dark === dark && cached.override === override) return cached;
  cached = { dark, override };
  return cached;
}

export function getThemeSnapshot(): ThemeSnapshot {
  return computeSnapshot();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  cached = null;
  for (const listener of listeners) listener();
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function applyTheme(dark: boolean) {
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.removeAttribute("media");
    meta.setAttribute("content", dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
  emit();
}
