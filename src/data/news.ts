// واجهة بيانات الأخبار + سجل الحذف + إدارة المأموريات والمستخدمين
import { supabase } from "../lib/supabase";
import { DeletionLog, News, Office, Profile } from "../types";

// ===== الأخبار =====

export async function listNews(): Promise<News[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as News[]) ?? [];
}

export async function createNews(values: Partial<News>): Promise<News> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("news")
    .insert({ ...values, created_by: u.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as News;
}

export async function updateNews(id: number, values: Partial<News>): Promise<void> {
  const { error } = await supabase.from("news").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteNews(id: number): Promise<void> {
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw error;
}

// ===== المأموريات (إدارة) =====

export async function createOffice(values: Partial<Office>): Promise<Office> {
  const { data, error } = await supabase.from("offices").insert(values).select().single();
  if (error) throw error;
  return data as Office;
}

export async function updateOffice(id: number, values: Partial<Office>): Promise<void> {
  const { error } = await supabase.from("offices").update(values).eq("id", id);
  if (error) throw error;
}

export async function setOfficeStatus(id: number, status: "active" | "inactive"): Promise<void> {
  const { error } = await supabase.rpc("admin_set_office_status", { p_office: id, p_status: status });
  if (error) throw error;
}

// ===== المستخدمون (إدارة) =====

export async function setUserStatus(targetId: string, status: "active" | "suspended"): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_status", { target: targetId, p_status: status });
  if (error) throw error;
}

export async function requestPasswordReset(targetId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_request_password_reset", { target: targetId });
  if (error) throw error;
}

export async function updateOwnProfile(values: Partial<Profile>): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("profiles").update(values).eq("id", u.user?.id ?? "");
  if (error) throw error;
}

// ===== سجل الحذف =====

export async function listDeletionLog(): Promise<DeletionLog[]> {
  const { data, error } = await supabase
    .from("deletion_log")
    .select("*")
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data as DeletionLog[]) ?? [];
}

export async function headDeleteTaxpayer(taxpayerId: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc("head_delete_taxpayer", {
    target_id: taxpayerId,
    p_reason: reason,
  });
  if (error) throw error;
}
