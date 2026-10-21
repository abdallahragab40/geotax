// سجل الممولين والتعديلات (إدارة الحصر)
import { supabase } from "../lib/supabase";
import { Taxpayer, TaxpayerModification } from "../types";
import { cleanSearch } from "../utils";

export async function listRegistry(search?: string, source?: string): Promise<Taxpayer[]> {
  let q = supabase.from("taxpayers").select("*").order("created_at", { ascending: false });
  if (source) q = q.eq("source", source);
  if (search && search.trim()) {
    const s = `%${cleanSearch(search)}%`;
    q = q.or(`tax_number.ilike.${s},name.ilike.${s},national_id.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as Taxpayer[]) ?? [];
}

// ملف الممول المرتبط بالحساب الحالي (لصفحة الممول)
export async function getMyTaxpayerFile(): Promise<Taxpayer | null> {
  const { data: u } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("taxpayers")
    .select("*")
    .eq("user_id", u.user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Taxpayer) ?? null;
}

export async function getTaxpayerFile(id: number): Promise<Taxpayer | null> {
  const { data, error } = await supabase.from("taxpayers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Taxpayer) ?? null;
}

export async function createTaxpayerFile(values: Record<string, any>): Promise<Taxpayer> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("taxpayers")
    .insert({ ...values, created_by: u.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Taxpayer;
}

export async function updateTaxpayerFile(id: number, values: Record<string, any>): Promise<void> {
  const { error } = await supabase.from("taxpayers").update(values).eq("id", id);
  if (error) throw error;
}

export async function listModifications(taxpayerId: number): Promise<TaxpayerModification[]> {
  const { data, error } = await supabase
    .from("taxpayer_modifications")
    .select("*")
    .eq("taxpayer_id", taxpayerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TaxpayerModification[]) ?? [];
}

export async function addModification(
  taxpayerId: number,
  values: Record<string, any>
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("taxpayer_modifications")
    .insert({ ...values, taxpayer_id: taxpayerId, created_by: u.user?.id });
  if (error) throw error;
}
