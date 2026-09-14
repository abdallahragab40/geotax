// طبقة الوصول للبيانات عبر Supabase
import { supabase } from "../lib/supabase";
import { Conversation, DeptRecord, Message, Profile } from "../types";

// ===== سجلات الإدارات (عامة لأي جدول) =====

export async function listRecords(
  table: string,
  search?: string
): Promise<DeptRecord[]> {
  let query = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`tax_number.ilike.${q},name.ilike.${q}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as DeptRecord[]) ?? [];
}

export async function getRecord(table: string, id: number): Promise<DeptRecord | null> {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DeptRecord) ?? null;
}

export async function createRecord(
  table: string,
  values: Record<string, any>
): Promise<DeptRecord> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from(table)
    .insert({ ...values, created_by: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as DeptRecord;
}

export async function updateRecord(
  table: string,
  id: number,
  values: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from(table).update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteRecord(table: string, id: number): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// ===== الملفات الشخصية =====

export async function getEmployeeProfile(): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Profile) ?? null;
}

// قائمة الموظفين الداخليين (للمدير)
export async function listStaff(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", [
      "admin", "office_head", "it_manager",
      "survey_manager", "survey_reviewer", "surveyor",
      "exam_manager", "exam_reviewer", "examiner", "employee",
    ])
    .order("created_at");
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function listTaxpayers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "taxpayer")
    .order("full_name");
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

// ===== الرسائل =====

export async function getMessagesWith(otherId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${otherId},receiver_id.eq.${otherId}`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function sendMessage(receiverId: string, body: string): Promise<Message> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: userData.user?.id, receiver_id: receiverId, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markRead(fromId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", userData.user?.id)
    .eq("sender_id", fromId)
    .eq("read", false);
}

// بناء قائمة محادثات من قائمة أطراف معطاة (آخر رسالة + عدد غير المقروء)
export async function buildConversations(
  myId: string,
  others: Profile[]
): Promise<Conversation[]> {
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  const messages = (msgs as Message[]) ?? [];

  return others
    .filter((p) => p.id !== myId)
    .map((p) => {
      const conv = messages.filter((m) => m.sender_id === p.id || m.receiver_id === p.id);
      const unread = conv.filter((m) => m.receiver_id === myId && !m.read).length;
      return { profile: p, lastMessage: conv[0], unread };
    });
}

// محادثات الموظف: الممولون + الزملاء (موظفون ومدير)
export async function listStaffConversations(myId: string): Promise<Conversation[]> {
  const [taxpayers, staff] = await Promise.all([listTaxpayers(), listStaff()]);
  return buildConversations(myId, [...staff, ...taxpayers]);
}

// محادثات الممول: مع الموظفين فقط
export async function listTaxpayerConversations(myId: string): Promise<Conversation[]> {
  const staff = await listStaff();
  return buildConversations(myId, staff);
}

// رمز إشعار الطرف الآخر (لإرسال إشعار دفع)
export async function getPushToken(targetId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_push_token", { target: targetId });
  if (error) return null;
  return (data as string) ?? null;
}
