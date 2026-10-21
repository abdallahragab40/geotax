// الطلبات (Workflow) والشكاوى
import { supabase } from "../lib/supabase";
import { Complaint, ComplaintTracking, Request } from "../types";

// ===== الطلبات =====

export async function listRequestsByDept(department: string): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("department", department)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Request[]) ?? [];
}

export async function listMyRequests(department?: string): Promise<Request[]> {
  const { data: u } = await supabase.auth.getUser();
  let q = supabase
    .from("requests")
    .select("*")
    .eq("applicant_id", u.user?.id ?? "")
    .order("created_at", { ascending: false });
  if (department) q = q.eq("department", department);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Request[]) ?? [];
}

export async function getRequest(id: number): Promise<Request | null> {
  const { data, error } = await supabase.from("requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Request) ?? null;
}

export async function createRequest(values: Record<string, any>): Promise<Request> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("requests")
    .insert({ ...values, applicant_id: u.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Request;
}

export async function updateRequest(id: number, values: Record<string, any>): Promise<void> {
  const { error } = await supabase.from("requests").update(values).eq("id", id);
  if (error) throw error;
}

// ===== الشكاوى =====

// تقديم الشكوى — يُرجع رقم الشكوى للمتابعة
export async function createComplaint(values: Record<string, any>): Promise<string> {
  const { data, error } = await supabase.rpc("submit_complaint", {
    p_office: values.office_id,
    p_name: values.complainant_name,
    p_national: values.complainant_national_id,
    p_phone: values.complainant_phone,
    p_accused: values.accused_name,
    p_activity: values.activity ?? "",
    p_address: values.address ?? "",
    p_lat: values.latitude ?? null,
    p_lng: values.longitude ?? null,
    p_details: values.details ?? "",
    p_photos: values.photos ?? [],
  });
  if (error) throw error;
  return data as string;
}

// متابعة الشكوى بدون تسجيل دخول: رقم الشكوى + رقم الموبايل
export async function trackComplaint(code: string, phone: string): Promise<ComplaintTracking | null> {
  const { data, error } = await supabase.rpc("track_complaint", { p_code: code.trim(), p_phone: phone.trim() });
  if (error) throw error;
  return ((data as ComplaintTracking[]) ?? [])[0] ?? null;
}

// الشكاوى حسب الدور: مأمور الحصر (المسندة إليه) / رئيس المأمورية (المصعّدة والمتأخرة) / الباقي كما كان
export async function listComplaintInbox(): Promise<Complaint[]> {
  const { data, error } = await supabase.rpc("my_complaints_inbox");
  if (error) throw error;
  return (data as Complaint[]) ?? [];
}

export async function escalateComplaint(id: number, note: string): Promise<void> {
  const { error } = await supabase.rpc("escalate_complaint", { p_id: id, p_note: note.trim() });
  if (error) throw error;
}

export async function setComplaintOverdueDays(days: number): Promise<void> {
  const { error } = await supabase.rpc("set_complaint_overdue_days", { p_days: days });
  if (error) throw error;
}

export async function listComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Complaint[]) ?? [];
}

export async function getComplaint(id: number): Promise<Complaint | null> {
  const { data, error } = await supabase.from("complaints").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Complaint) ?? null;
}

export async function updateComplaint(id: number, values: Record<string, any>): Promise<void> {
  const { error } = await supabase.from("complaints").update(values).eq("id", id);
  if (error) throw error;
}
