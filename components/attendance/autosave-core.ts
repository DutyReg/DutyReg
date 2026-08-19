export type SaveState = "saved" | "saving" | "unsaved";

export interface AutosaveOptions {
  /** Debounce window before an automatic save fires. */
  delayMs: number;
  /** Persists the current data. Must return true on success. */
  save: () => Promise<boolean>;
  /** Best-effort flush that survives page unload (e.g. a keepalive fetch). */
  finalSave?: () => void;
  onStateChange?: (state: SaveState) => void;
}

export interface Autosave {
  scheduleSave(): void;
  flushNow(): Promise<boolean>;
  isDirty(): boolean;
  /** Cancel the timer; flush immediately if there are unsaved changes. */
  dispose(): void;
  /** Cancel the timer; run the unload-safe flush if there are unsaved changes. */
  finalize(): void;
}

export function createAutosave({
  delayMs,
  save,
  finalSave,
  onStateChange,
}: AutosaveOptions): Autosave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleSave() {
    dirty = true;
    onStateChange?.("unsaved");
    clearTimer();
    timer = setTimeout(() => void flushNow(), delayMs);
  }

  async function flushNow(): Promise<boolean> {
    clearTimer();
    onStateChange?.("saving");
    const ok = await save();
    if (!ok) {
      onStateChange?.("unsaved");
      return false;
    }
    dirty = false;
    onStateChange?.("saved");
    return true;
  }

  function dispose() {
    clearTimer();
    if (dirty) void flushNow();
  }

  function finalize() {
    clearTimer();
    if (dirty && finalSave) finalSave();
  }

  function isDirty() {
    return dirty;
  }

  return { scheduleSave, flushNow, isDirty, dispose, finalize };
}