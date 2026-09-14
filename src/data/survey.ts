// واجهة بيانات إدارة الحصر — الفروع، المخازن، الأنشطة الفرعية، المهام، البحث المركزي
import { supabase } from "../lib/supabase";
import {
  Branch, CentralSearchResult, SubActivity, Task, Warehouse,
} from "../types";

// ===== فروع / مخازن / أنشطة فرعية =====
async function listFor<T>(table: string, taxpayerId: number): Promise<T[]> {
  const { data, error } = await supabase
    .from(table).select("*").eq("taxpayer_id", taxpayerId).order("created_at");
  if (error) throw error;
  return (data as T[]) ?? [];
}

export const listBranches = (taxpayerId: number) => listFor<Branch>("branches", taxpayerId);
export const listWarehouses = (taxpayerId: number) => listFor<Warehouse>("warehouses", taxpayerId);
export const listSubActivities = (taxpayerId: number) => listFor<SubActivity>("sub_activities", taxpayerId);

async function createFor<T>(table: string, values: Record<string, any>): Promise<T> {
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("office_id").eq("id", u.user?.id ?? "").maybeSingle();
  const { data, error } = await supabase
    .from(table).insert({ ...values, created_by: u.user?.id, office_id: p?.office_id ?? null })
    .select().single();
  if (error) throw error;
  return data as T;
}
export const addBranch = (v: Partial<Branch>) => createFor<Branch>("branches", v);
export const addWarehouse = (v: Partial<Warehouse>) => createFor<Warehouse>("warehouses", v);
export const addSubActivity = (v: Partial<SubActivity>) => createFor<SubActivity>("sub_activities", v);

// ===== المهام =====

export async function listMyTasks(): Promise<Task[]> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tasks").select("*").eq("assigned_to", u.user?.id ?? "")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Task[]) ?? [];
}

export async function listAssignedByMe(): Promise<Task[]> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tasks").select("*").eq("assigned_by", u.user?.id ?? "")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Task[]) ?? [];
}

export async function getTask(id: number): Promise<Task | null> {
  const { data } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  return (data as Task) ?? null;
}

export async function createTask(values: Partial<Task>): Promise<Task> {
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("office_id").eq("id", u.user?.id ?? "").maybeSingle();
  const { data, error } = await supabase
    .from("tasks").insert({ ...values, assigned_by: u.user?.id, office_id: p?.office_id ?? null })
    .select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: number, values: Partial<Task>): Promise<void> {
  const { error } = await supabase.from("tasks").update(values).eq("id", id);
  if (error) throw error;
}

// ===== البحث المركزي =====

export async function centralSearch(taxNumber: string): Promise<CentralSearchResult[]> {
  const { data, error } = await supabase.rpc("central_search", { p_tax: taxNumber.trim() });
  if (error) throw error;
  return (data as CentralSearchResult[]) ?? [];
}

// ===== من فتح الملف =====
export async function getTaxpayerOpener(taxpayerId: number): Promise<{ opener_name: string; opened_at: string } | null> {
  const { data, error } = await supabase.rpc("taxpayer_opener", { p_taxpayer: taxpayerId });
  if (error) return null;
  const row = (data as any[])?.[0];
  return row ? { opener_name: row.opener_name, opened_at: row.opened_at } : null;
}
