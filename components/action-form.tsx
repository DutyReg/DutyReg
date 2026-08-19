"use client";

import { useActionState, type ReactNode } from "react";

import { InlineError, Spinner } from "@/components/ui";
import type { ActionResult } from "@/app/actions/auth";

export function ActionForm({
  action,
  children,
  className = "",
  submitLabel,
  successMessage = "Saved",
  resetKey,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  submitLabel?: ReactNode;
  successMessage?: string;
  resetKey?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_state: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  const error = state && "error" in state ? state.error : null;
  const succeeded = state && "success" in state;

  return (
    <form action={formAction} className={`grid gap-3 ${className}`} key={resetKey}>
      {children}
      <InlineError>{error}</InlineError>
      {succeeded ? (
        <p className="rounded-lg bg-present-soft px-4 py-2.5 text-sm font-medium text-present-ink">
          {successMessage}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-inverse-text transition-colors hover:bg-ink-soft active:translate-y-px disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-inverse-text dark:hover:opacity-80 dark:active:opacity-70"
        >
          {pending ? <Spinner /> : submitLabel ?? "Save"}
        </button>
      </div>
    </form>
  );
}