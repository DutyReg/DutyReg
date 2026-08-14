"use server";

import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OwnerContext } from "@/lib/types";
import type { ActionResult } from "@/app/actions/auth";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

async function requireOwnerCompany(): Promise<OwnerContext | null> {
  const ctx = await getContext();
  if (!ctx || !ctx.company || ctx.role !== "owner") return null;
  return { ...ctx, company: ctx.company };
}

export async function addMember(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage members." };

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!ROLES.includes(role)) return { error: "Choose a valid role." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_company_member", {
    p_company: ctx.company.id,
    p_email: email,
    p_role: role,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMemberRole(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage members." };

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) return { error: "Choose a valid role." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_company_member", {
    p_company: ctx.company.id,
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const ctx = await requireOwnerCompany();
  if (!ctx) return { error: "Only the owner can manage members." };

  const userId = String(formData.get("userId") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_company_member", {
    p_company: ctx.company.id,
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  return { success: true };
}