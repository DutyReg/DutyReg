import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAutosave, type SaveState } from "@/components/attendance/autosave-core";

function recordStates() {
  const states: SaveState[] = [];
  return {
    states,
    onStateChange: (s: SaveState) => states.push(s),
  };
}

describe("createAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays saved until a change schedules a save, then saves after the delay", async () => {
    const save = vi.fn(async () => true);
    const { states, onStateChange } = recordStates();
    const core = createAutosave({ delayMs: 900, save, onStateChange });

    expect(core.isDirty()).toBe(false);
    core.scheduleSave();

    expect(core.isDirty()).toBe(true);
    expect(states).toEqual(["unsaved"]);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(900);
    expect(save).toHaveBeenCalledTimes(1);
    expect(core.isDirty()).toBe(false);
    expect(states).toEqual(["unsaved", "saving", "saved"]);
  });

  it("debounces: rapid scheduleSave calls trigger exactly one save", async () => {
    const save = vi.fn(async () => true);
    const core = createAutosave({ delayMs: 900, save });

    core.scheduleSave();
    await vi.advanceTimersByTimeAsync(300);
    core.scheduleSave();
    await vi.advanceTimersByTimeAsync(300);
    core.scheduleSave();

    await vi.advanceTimersByTimeAsync(899);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("stays dirty and unsaved when the save fails", async () => {
    const save = vi.fn(async () => false);
    const { states, onStateChange } = recordStates();
    const core = createAutosave({ delayMs: 100, save, onStateChange });

    core.scheduleSave();
    await vi.advanceTimersByTimeAsync(100);

    expect(save).toHaveBeenCalledTimes(1);
    expect(core.isDirty()).toBe(true);
    expect(states).toEqual(["unsaved", "saving", "unsaved"]);
  });

  it("recovers on a later scheduleSave after a failed save", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const core = createAutosave({ delayMs: 100, save });

    core.scheduleSave();
    await vi.advanceTimersByTimeAsync(100);
    expect(core.isDirty()).toBe(true);

    core.scheduleSave();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(2);
    expect(core.isDirty()).toBe(false);
  });

  it("flushNow cancels the pending timer and saves immediately", async () => {
    const save = vi.fn(async () => true);
    const core = createAutosave({ delayMs: 900, save });

    core.scheduleSave();
    const result = await core.flushNow();

    expect(result).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flushNow saves even when nothing is dirty", async () => {
    const save = vi.fn(async () => true);
    const core = createAutosave({ delayMs: 900, save });

    const result = await core.flushNow();
    expect(result).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(core.isDirty()).toBe(false);
  });

  it("dispose flushes when dirty and stays silent when clean", async () => {
    const save = vi.fn(async () => true);
    const dirty = createAutosave({ delayMs: 900, save });

    dirty.scheduleSave();
    dirty.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(dirty.isDirty()).toBe(false);

    save.mockClear();
    const clean = createAutosave({ delayMs: 900, save });
    clean.dispose();
    expect(save).not.toHaveBeenCalled();
  });

  it("finalize runs the unload-safe flush when dirty, never the normal save", async () => {
    const save = vi.fn(async () => true);
    const finalSave = vi.fn();
    const core = createAutosave({ delayMs: 900, save, finalSave });

    core.scheduleSave();
    core.finalize();

    expect(finalSave).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();

    save.mockClear();
    finalSave.mockClear();
    const clean = createAutosave({ delayMs: 900, save, finalSave });
    clean.finalize();
    expect(finalSave).not.toHaveBeenCalled();
  });

  it("finalize on a clean state does nothing", async () => {
    const save = vi.fn(async () => true);
    const finalSave = vi.fn();
    const core = createAutosave({ delayMs: 900, save, finalSave });

    core.finalize();
    expect(finalSave).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});