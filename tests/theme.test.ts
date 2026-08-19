import { beforeEach, describe, expect, it } from "vitest";

import {
  applyTheme,
  DARK_THEME_COLOR,
  getThemeSnapshot,
  isDarkMode,
  LIGHT_THEME_COLOR,
  subscribeTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

class FakeMeta {
  media: string | null;
  content: string;

  constructor(media: string | null, content: string) {
    this.media = media;
    this.content = content;
  }

  removeAttribute(name: string) {
    if (name === "media") this.media = null;
  }

  setAttribute(name: string, value: string) {
    if (name === "content") this.content = value;
  }
}

class FakeClassList {
  private values = new Set<string>();

  contains(name: string) {
    return this.values.has(name);
  }

  toggle(name: string, force?: boolean) {
    const has = this.values.has(name);
    if (force === undefined) {
      if (has) this.values.delete(name);
      else this.values.add(name);
      return !has;
    }
    if (force) this.values.add(name);
    else this.values.delete(name);
    return force;
  }
}

let el: { classList: FakeClassList; style: Record<string, string> };
let metas: FakeMeta[];
let storage: Map<string, string>;

function installDomStubs() {
  el = { classList: new FakeClassList(), style: {} };
  metas = [
    new FakeMeta("(prefers-color-scheme: light)", "#f8fbff"),
    new FakeMeta("(prefers-color-scheme: dark)", "#0a0f12"),
  ];
  storage = new Map<string, string>();
  globalThis.document = {
    documentElement: el,
    querySelectorAll: () => metas,
  } as unknown as Document;
  globalThis.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  } as unknown as Storage;
}

beforeEach(() => {
  installDomStubs();
});

describe("isDarkMode", () => {
  it("reports whether the .dark class is present", () => {
    expect(isDarkMode()).toBe(false);
    el.classList.toggle("dark", true);
    expect(isDarkMode()).toBe(true);
  });
});

describe("applyTheme", () => {
  it("applies dark: adds .dark class and color-scheme", () => {
    applyTheme(true);
    expect(el.classList.contains("dark")).toBe(true);
    expect(el.style.colorScheme).toBe("dark");
  });

  it("applies light: removes .dark class and color-scheme", () => {
    el.classList.toggle("dark", true);
    applyTheme(false);
    expect(el.classList.contains("dark")).toBe(false);
    expect(el.style.colorScheme).toBe("light");
  });

  it("syncs the theme-color metas to the active mode", () => {
    applyTheme(true);
    for (const meta of metas) {
      expect(meta.media).toBeNull();
      expect(meta.content).toBe(DARK_THEME_COLOR);
    }
    applyTheme(false);
    for (const meta of metas) {
      expect(meta.content).toBe(LIGHT_THEME_COLOR);
    }
  });
});

describe("getThemeSnapshot", () => {
  it("reflects the applied theme and override state", () => {
    expect(getThemeSnapshot()).toEqual({ dark: false, override: false });
    storage.set(THEME_STORAGE_KEY, "dark");
    applyTheme(true);
    expect(getThemeSnapshot()).toEqual({ dark: true, override: true });
  });

  it("returns a stable object identity between changes", () => {
    const first = getThemeSnapshot();
    const second = getThemeSnapshot();
    expect(first).toBe(second);
  });
});

describe("subscribeTheme", () => {
  it("notifies listeners when the theme changes", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeTheme(() => seen.push(el.classList.contains("dark")));
    applyTheme(true);
    applyTheme(false);
    expect(seen).toEqual([true, false]);
    unsubscribe();
    applyTheme(true);
    expect(seen).toEqual([true, false]);
  });
});
