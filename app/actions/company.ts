"use server";

import { redirect } from "next/navigation";

import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/auth";

export async function createCompany(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a company name (at least 2 characters)." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company", { p_name: name });

  if (error) return { error: error.message };
  redirect(`/settings?company=${data}`);
}

export async function updateCompanyName(formData: FormData): Promise<ActionResult> {
  const ctx = await getContext();
  if (!ctx?.company || ctx.role !== "owner") return { error: "Access denied." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a company name (at least 2 characters)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", ctx.company.id);

  return error ? { error: error.message } : { success: true };
}