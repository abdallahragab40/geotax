// سجل الممولين والتعديلات (إدارة الحصر)
import { supabase } from "../lib/supabase";
import { FileRequestTracking, Taxpayer, TaxpayerActivation, TaxpayerModification } from "../types";
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

// ===== طلب فتح ملف (ممول بدون ملف) =====

// متابعة الطلب بدون تسجيل دخول: رقم الطلب + رقم الموبايل
export async function trackFileRequest(code: string, phone: string): Promise<FileRequestTracking | null> {
  const { data, error } = await supabase.rpc("track_file_request", { p_code: code.trim(), p_phone: phone.trim() });
  if (error) throw error;
  return ((data as FileRequestTracking[]) ?? [])[0] ?? null;
}

// طلب الممول الحالي (للشاشة الرئيسية)
export async function getMyFileRequest(): Promise<{ request_code: string; status: string; note: string; updated_at: string } | null> {
  const { data, error } = await supabase.rpc("my_file_request");
  if (error) return null;
  return (data as any[])?.[0] ?? null;
}

// الموظف يحدّث حالة الطلب (يُبلَّغ الممول ويُسجَّل في سجل العمليات)
export async function setFileRequestStatus(taxpayerId: number, status: string, note: string): Promise<void> {
  const { error } = await supabase.rpc("set_file_request_status", {
    p_taxpayer: taxpayerId, p_status: status, p_note: note.trim(),
  });
  if (error) throw error;
}

// ===== تفعيل حساب ممول صاحب ملف =====

export async function getMyActivationStatus(): Promise<{ status: string; tax_number: string; code_issued: boolean } | null> {
  const { data, error } = await supabase.rpc("my_activation_status");
  if (error) return null;
  return (data as any[])?.[0] ?? null;
}

export async function verifyActivation(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_account_activation", { p_code: code.trim() });
  if (error) throw error;
  return !!data;
}

export async function listPendingActivations(): Promise<TaxpayerActivation[]> {
  const { data, error } = await supabase
    .from("taxpayer_activations")
    .select("id, user_id, taxpayer_id, office_id, tax_number, full_name, national_id, phone, status, code_issued_at, attempts, created_at, taxpayers(name, phone)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as TaxpayerActivation[]) ?? [];
}

// يُرجع الرمز ليبلغه الموظف للممول بعد التحقق من شخصيته
export async function issueActivationCode(id: number): Promise<string> {
  const { data, error } = await supabase.rpc("issue_activation_code", { p_id: id });
  if (error) throw error;
  return data as string;
}

export async function rejectActivation(id: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc("reject_account_activation", { p_id: id, p_reason: reason.trim() });
  if (error) throw error;
}
