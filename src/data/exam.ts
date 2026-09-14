// واجهة بيانات إدارة الفحص — المعاينات + طلبات الحضور + المواعيد + التوقفات
import { supabase } from "../lib/supabase";
import {
  AttendanceRequest, Inspection, InspectionAppointment, StopRecord,
} from "../types";

async function withMeta(values: Record<string, any>) {
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("office_id").eq("id", u.user?.id ?? "").maybeSingle();
  return { ...values, created_by: u.user?.id, office_id: p?.office_id ?? null };
}

// ===== المعاينات =====
export async function createInspection(values: Partial<Inspection>): Promise<Inspection> {
  const { data, error } = await supabase.from("inspections").insert(await withMeta(values)).select().single();
  if (error) throw error;
  return data as Inspection;
}
export async function listInspections(taxpayerId?: number): Promise<Inspection[]> {
  let q = supabase.from("inspections").select("*").order("created_at", { ascending: false });
  if (taxpayerId) q = q.eq("taxpayer_id", taxpayerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Inspection[]) ?? [];
}

// ===== طلبات الحضور =====
export async function createAttendanceRequest(values: Partial<AttendanceRequest>): Promise<AttendanceRequest> {
  const { data, error } = await supabase.from("attendance_requests").insert(await withMeta(values)).select().single();
  if (error) throw error;
  return data as AttendanceRequest;
}
export async function listAttendanceRequests(taxpayerId?: number): Promise<AttendanceRequest[]> {
  let q = supabase.from("attendance_requests").select("*").order("created_at", { ascending: false });
  if (taxpayerId) q = q.eq("taxpayer_id", taxpayerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as AttendanceRequest[]) ?? [];
}

// ===== مواعيد المعاينة =====
export async function createAppointment(values: Partial<InspectionAppointment>): Promise<InspectionAppointment> {
  const { data, error } = await supabase.from("inspection_appointments").insert(await withMeta(values)).select().single();
  if (error) throw error;
  return data as InspectionAppointment;
}
export async function listAppointments(taxpayerId?: number): Promise<InspectionAppointment[]> {
  let q = supabase.from("inspection_appointments").select("*").order("created_at", { ascending: false });
  if (taxpayerId) q = q.eq("taxpayer_id", taxpayerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as InspectionAppointment[]) ?? [];
}

// ===== التوقفات =====
export async function createPartialStop(values: Partial<StopRecord>): Promise<StopRecord> {
  const { data, error } = await supabase.from("partial_stops").insert(await withMeta(values)).select().single();
  if (error) throw error;
  return data as StopRecord;
}
export async function createFinalStop(values: Partial<StopRecord>): Promise<StopRecord> {
  const { data, error } = await supabase.from("final_stops").insert(await withMeta(values)).select().single();
  if (error) throw error;
  return data as StopRecord;
}
export async function listStops(kind: "partial" | "final", taxpayerId?: number): Promise<StopRecord[]> {
  const table = kind === "partial" ? "partial_stops" : "final_stops";
  let q = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (taxpayerId) q = q.eq("taxpayer_id", taxpayerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as StopRecord[]) ?? [];
}
