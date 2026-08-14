"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { signInWithPassword, signUp } from "@/app/actions/auth";
import type { ActionResult } from "@/app/actions/auth";
import { Btn, Field, InlineError, Input } from "@/components/ui";
import { useSupabaseClient } from "@/lib/supabase/use-supabase";
import { Spinner } from "@/components/ui";

export function GoogleButton() {
  const [state, setState] = useState<"idle" | "loading">("idle");
  const router = useRouter();
  const supabase = useSupabaseClient();

  async function handleGoogle() {
    setState("loading");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setState("idle");
    } else {
      router.refresh();
    }
  }

  return (
    <Btn
      type="button"
      variant="secondary"
      size="lg"
      disabled={state === "loading"}
      onClick={handleGoogle}
      className="w-full"
    >
      {state === "loading" ? <Spinner /> : <GoogleGlyph />}
      Continue with Google
    </Btn>
  );
}

export function EmailForm({ mode }: { mode: "signin" | "signup" }) {
  const action = mode === "signin" ? signInWithPassword : signUp;
  const [state, formAction, pending] = useActionState(
    async (_state: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  const router = useRouter();

  if (state && "success" in state) {
    router.refresh();
    return (
      <p className="rounded-lg bg-present-soft px-4 py-3 text-sm font-medium text-present-ink">
        {mode === "signup"
          ? "Account created. Check your email for the confirmation link, then sign in."
          : "Signed in successfully."}
      </p>
    );
  }

  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="grid gap-4">
      {mode === "signup" ? (
        <Field label="Full name">
          <Input name="fullName" autoComplete="name" required minLength={2} />
        </Field>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" inputMode="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={8}
        />
      </Field>
      {mode === "signup" ? (
        <Field label="Confirm password">
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
      ) : null}
      <InlineError>{error}</InlineError>
      <Btn type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Spinner /> : mode === "signin" ? "Sign in" : "Create account"}
      </Btn>
    </form>
  );
}

export function LoginToggle({
  mode,
  onChange,
}: {
  mode: "signin" | "signup";
  onChange: (mode: "signin" | "signup") => void;
}) {
  return (
    <p className="text-sm text-muted">
      {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
      <button
        type="button"
        className="font-semibold text-ink underline decoration-primary decoration-2 underline-offset-2"
        onClick={() => onChange(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Create an account" : "Sign in"}
      </button>
    </p>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.16 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.27v3.1A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.22 7.22 0 0 1 4.93 12c0-.79.14-1.56.36-2.29v-3.1H1.27a11.99 11.99 0 0 0 0 10.78l4.02-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A11.99 11.99 0 0 0 1.27 6.61l4.02 3.1C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
  );
}