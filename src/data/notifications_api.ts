// واجهة الإشعارات
import { supabase } from "../lib/supabase";
import { Notification } from "../types";

export async function listNotifications(): Promise<Notification[]> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", u.user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Notification[]) ?? [];
}

export async function countUnreadNotifications(): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", u.user?.id ?? "")
    .eq("read", false);
  return count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await supabase.rpc("mark_notification_read", { p_id: id });
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.rpc("mark_all_notifications_read");
}

// اعتماد ملف جديد + تعيين رقم تسجيل ضريبي
export async function assignTaxNumber(taxpayerId: number, taxNumber: string): Promise<void> {
  const { error } = await supabase.rpc("assign_tax_number", {
    p_taxpayer: taxpayerId,
    p_tax: taxNumber.trim(),
  });
  if (error) throw error;
}
