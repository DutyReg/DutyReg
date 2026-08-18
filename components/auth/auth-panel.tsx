"use client";

import { useState } from "react";

import { GoogleButton, EmailForm, LoginToggle } from "@/components/auth/auth-form";
import { InlineError } from "@/components/ui";

export function AuthPanel({ oauthError }: { oauthError?: string | null }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {mode === "signin" ? "Sign in to DutyReg" : "Create your account"}
        </h2>
        <p className="text-sm text-muted">
          {mode === "signin"
            ? "Use your account to record or view daily attendance."
            : "Your account is attached to a company by its owner."}
        </p>
      </div>

      {oauthError ? <InlineError>{oauthError}</InlineError> : null}

      <div className="grid gap-3">
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          or with email
          <span className="h-px flex-1 bg-border" />
        </div>
        <EmailForm mode={mode} />
      </div>

      <LoginToggle mode={mode} onChange={setMode} />
    </div>
  );
}