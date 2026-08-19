"use server";

import { revalidatePath } from "next/cache";

import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OwnerContext } from "@/lib/types";
import type { ActionResult } from "@/app/actions/auth";

async function requireOwnerCompany(): Promise<OwnerContext | null> {
  const ctx = await getContext();
  if (!ctx || !ctx.company || ctx.role !== "owner") return null;
  return { ...ctx, company: ctx.company };
}

export async function addSite(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage sites." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a site name (at least 2 characters)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .insert({ company_id: ctx.company.id, name });

  if (error) return { error: error.message };
  revalidatePath("/settings/sites");
  return { success: true };
}

export async function renameSite(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage sites." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a site name (at least 2 characters)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ name })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/sites");
  return { success: true };
}

export async function deleteSite(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage sites." };

  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/sites");
  return { success: true };
}
