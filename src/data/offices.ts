// قائمة المأموريات وعمليات الإدارة
import { supabase } from "../lib/supabase";
import { Office } from "../types";

export async function listOffices(activeOnly = true): Promise<Office[]> {
  let q = supabase.from("offices").select("*").order("code");
  if (activeOnly) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) throw error;
  return (data as Office[]) ?? [];
}

export async function getOffice(id: number): Promise<Office | null> {
  const { data } = await supabase.from("offices").select("*").eq("id", id).maybeSingle();
  return (data as Office) ?? null;
}

// تعيين مأمورية ودور لمستخدم (للأدمن أو رئيس المأمورية أو مدير الحاسب)
export async function assignOfficeRole(
  targetUserId: string,
  officeId: number,
  role: string,
  employeeNumber?: string
): Promise<void> {
  const { error } = await supabase.rpc("admin_assign_office_role", {
    target: targetUserId,
    p_office: officeId,
    p_role: role,
    p_emp_number: employeeNumber ?? null,
  });
  if (error) throw error;
}

// عَلِّم أن المستخدم غيّر كلمة المرور (يُلغي إجبار التغيير)
export async function markPasswordChanged(): Promise<void> {
  await supabase.rpc("mark_password_changed");
}
