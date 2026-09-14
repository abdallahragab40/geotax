// الطلبات (Workflow) والشكاوى
import { supabase } from "../lib/supabase";
import { Complaint, Request } from "../types";

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

export async function createComplaint(values: Record<string, any>): Promise<void> {
  const { error } = await supabase.from("complaints").insert(values);
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
