"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Owner updates the company-wide shift times used as attendance defaults. */
export async function updateCompanyHours(formData: FormData): Promise<ActionResult> {
  const ctx = await getContext();
  if (!ctx?.company || ctx.role !== "owner") return { error: "Access denied." };

  const start = String(formData.get("start_time") ?? "").trim();
  const end = String(formData.get("end_time") ?? "").trim();
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    return { error: "Enter valid times, e.g. 08:00 and 17:00." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ start_time: start, end_time: end })
    .eq("id", ctx.company.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}