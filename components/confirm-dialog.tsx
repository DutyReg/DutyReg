"use client";

import { useActionState, useEffect, useState } from "react";

import { InlineError, Spinner } from "@/components/ui";
import type { ActionResult } from "@/app/actions/auth";

export function ConfirmDialog({
  label,
  title,
  message,
  action,
  hiddenFields = {},
  confirmLabel = "Delete",
  successMessage = "Deleted.",
}: {
  label: string;
  title: string;
  message: string;
  action: (formData: FormData) => Promise<ActionResult>;
  hiddenFields?: Record<string, string>;
  confirmLabel?: string;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_state: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const error = state && "error" in state ? state.error : null;
  const succeeded = state && "success" in state;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center rounded-full border border-absent-border bg-absent-soft px-5 text-sm font-semibold text-absent-ink transition-colors active:translate-y-px hover:bg-absent-soft/70"
      >
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"
          >
            <p className="text-base font-semibold text-ink">{title}</p>
            <p className="mt-1.5 text-sm text-muted">{message}</p>
            <InlineError>{error}</InlineError>
            {succeeded ? (
              <p className="mt-3 rounded-lg bg-present-soft px-4 py-2.5 text-sm font-medium text-present-ink">
                {successMessage}
              </p>
            ) : null}
            <form action={formAction} className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(hiddenFields).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-absent px-4 text-sm font-semibold text-white transition-colors hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-50"
              >
                {pending ? <Spinner /> : null}
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}