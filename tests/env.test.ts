import { afterEach, describe, expect, it, vi } from "vitest";

import {
  needsConfiguration,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("needsConfiguration", () => {
  it("is true when env vars are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(needsConfiguration()).toBe(true);
  });

  it("is true when the URL is the placeholder", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "real-key");
    expect(needsConfiguration()).toBe(true);
  });

  it("is true when the key is the placeholder", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "your-publishable-key");
    expect(needsConfiguration()).toBe(true);
  });

  it("is false when env vars look real", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "eyJhbGciOiJIUzI1NiJ9.abc");
    expect(needsConfiguration()).toBe(false);
  });
});

describe("env accessors", () => {
  it("exposes the raw URL and key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "some-key");
    expect(supabaseUrl()).toBe("https://x.supabase.co");
    expect(supabasePublishableKey()).toBe("some-key");
  });

  it("returns empty strings when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(supabaseUrl()).toBe("");
    expect(supabasePublishableKey()).toBe("");
  });
});
