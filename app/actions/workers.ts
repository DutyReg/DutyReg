"use server";

import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OwnerContext } from "@/lib/types";
import type { ActionResult } from "@/app/actions/auth";

async function requireOwnerCompany(): Promise<OwnerContext | null> {
  const ctx = await getContext();
  if (!ctx || !ctx.company || ctx.role !== "owner") return null;
  return { ...ctx, company: ctx.company };
}

export async function addWorker(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage workers." };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("workerCode") ?? "").trim() || null;
  const siteId = String(formData.get("siteId") ?? "") || null;

  if (name.length < 2) return { error: "Enter a worker name (at least 2 characters)." };

  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    company_id: ctx.company.id,
    site_id: siteId,
    name,
    worker_code: code,
  });

  return error ? { error: error.message } : { success: true };
}

export async function updateWorker(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage workers." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("workerCode") ?? "").trim() || null;
  const siteId = String(formData.get("siteId") ?? "") || null;

  if (name.length < 2) return { error: "Enter a worker name (at least 2 characters)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({ name, worker_code: code, site_id: siteId })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  return error ? { error: error.message } : { success: true };
}

export async function toggleWorkerActive(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage workers." };

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({ active })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  return error ? { error: error.message } : { success: true };
}