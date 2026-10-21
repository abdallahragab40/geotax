// أنواع البيانات (نموذج سحابي - Supabase)

export type Role =
  | "admin"               // الإدارة العليا
  | "office_head"         // رئيس المأمورية
  | "it_manager"          // مدير الحاسب الآلي
  | "survey_manager"      // مدير الحصر
  | "survey_reviewer"     // مراجع الحصر
  | "surveyor"            // مأمور الحصر
  | "exam_manager"        // مدير الفحص
  | "exam_reviewer"       // مراجع الفحص
  | "examiner"            // مأمور الفحص
  | "seizer"              // (مُستبعد)
  | "taxpayer"
  | "complainant"
  | "employee";           // قديم — للتوافق

// كل الأدوار الداخلية (موظفون داخل المأمورية + الإدارة العليا)
export const STAFF_ROLES: Role[] = [
  "admin", "office_head", "it_manager",
  "survey_manager", "survey_reviewer", "surveyor",
  "exam_manager", "exam_reviewer", "examiner",
  "employee",
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "الإدارة العليا",
  office_head: "رئيس المأمورية",
  it_manager: "مدير الحاسب الآلي",
  survey_manager: "مدير الحصر",
  survey_reviewer: "مراجع الحصر",
  surveyor: "مأمور حصر",
  exam_manager: "مدير الفحص",
  exam_reviewer: "مراجع الفحص",
  examiner: "مأمور فحص",
  seizer: "مأمور حجز",
  taxpayer: "ممول",
  complainant: "مقدّم شكوى",
  employee: "موظف",
};

// المأمورية
export interface Office {
  id: number;
  code: string;
  name: string;
  governorate: string;
  region: string;
  status: string;
  complaint_overdue_days?: number;  // أيام قبل ظهور الشكوى لرئيس المأمورية
}

// الدور المسؤول عن كل إدارة
export const DEPT_ROLE: Record<string, Role> = {
  survey: "surveyor",
  examination: "examiner",
  seizure: "seizer",
};

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  national_id: string | null;
  phone: string | null;
  tax_number: string | null;
  expo_push_token: string | null;
  office_id: number | null;
  employee_number: string | null;
  must_change_password: boolean;
  status: string;            // active / suspended
  position_title: string;    // الوظيفة
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

// خبر
export interface News {
  id: number;
  title: string;
  content: string;
  audience: "all" | "office" | "role";
  office_id: number | null;
  target_role: string | null;
  created_by: string | null;
  created_at: string;
}

// فروع / مخازن / أنشطة فرعية
export interface Branch {
  id: number;
  taxpayer_id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  office_id: number | null;
  created_at: string;
}
export interface Warehouse {
  id: number;
  taxpayer_id: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  office_id: number | null;
  created_at: string;
}
export interface SubActivity {
  id: number;
  taxpayer_id: number;
  name: string;
  description: string;
  office_id: number | null;
  created_at: string;
}

// المهام (إسناد + خط السير)
export interface Task {
  id: number;
  task_type: "survey" | "exam";
  office_id: number | null;
  assigned_by: string | null;
  assigned_to: string | null;
  taxpayer_ids: number[];
  priority: string;        // عاجلة / مرتفعة / عادية / منخفضة
  due_date: string;
  status: string;          // جديدة / قيد التنفيذ / تم التنفيذ / مؤجلة / ملغاة
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  photos: string[];
  created_at: string;
}
export const TASK_PRIORITIES = ["عاجلة", "مرتفعة", "عادية", "منخفضة"];
export const TASK_STATUSES = ["جديدة", "قيد التنفيذ", "تم التنفيذ", "مؤجلة", "ملغاة"];
export const TASK_STATUS_COLORS: Record<string, string> = {
  "جديدة": "#2563EB",
  "قيد التنفيذ": "#D97706",
  "تم التنفيذ": "#0E7C66",
  "مؤجلة": "#7C3AED",
  "ملغاة": "#DC2626",
};

// إدارة الفحص — معاينات وطلبات وحضور وتوقفات
export interface Inspection {
  id: number;
  taxpayer_id: number;
  inspection_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  result: string;
  exam_latitude: number | null;
  exam_longitude: number | null;
  photos: string[];
  documents: string[];
  office_id: number | null;
  created_by: string | null;
  created_at: string;
}
export interface AttendanceRequest {
  id: number;
  taxpayer_id: number;
  attend_date: string;
  attend_time: string;
  reason: string;
  notes: string;
  status: string;
  office_id: number | null;
  created_at: string;
}
export interface InspectionAppointment {
  id: number;
  taxpayer_id: number;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: string;
  office_id: number | null;
  created_at: string;
}
export interface StopRecord {
  id: number;
  taxpayer_id: number;
  stop_date: string;
  reason: string;
  notes: string;
  photos: string[];
  office_id: number | null;
  created_at: string;
}

// نتيجة البحث المركزي (محدود)
export interface CentralSearchResult {
  name: string;
  activity: string;
  start_date: string;
  address: string;
  office_name: string;
  office_code: string;
}

// سجل حذف
export interface DeletionLog {
  id: number;
  entity_type: string;
  entity_id: number | null;
  entity_snapshot: any;
  office_id: number | null;
  reason: string;
  deleted_by: string | null;
  deleted_at: string;
}

// سجل عام لأي إدارة (الحقول تختلف حسب الإدارة، نتعامل معها كقاموس)
export interface DeptRecord {
  id: number;
  tax_number: string;
  name?: string;
  status?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  photos?: string[];
  created_by?: string | null;
  created_at: string;
  [key: string]: any;
}

// سجل الممول المركزي
export interface Taxpayer {
  id: number;
  tax_number: string | null;
  name: string;
  national_id: string;
  activity: string;
  address: string;
  start_date: string;
  latitude: number | null;
  longitude: number | null;
  status: string; // قيد الحصر / مسجل / طلب جديد
  legal_entity: string;
  phone: string;
  last_accounting: string;
  source: string; // imported / survey / request
  registered: boolean; // له حساب مستخدم
  user_id: string | null;
  summary: string; // ملخص المعاينة
  photos: string[];
  office_id: number | null;
  activity_status: string; // active / partial_stop / final_stop
  created_at: string;
  request_code: string | null;      // رقم طلب فتح الملف (التسجيل الذاتي)
  request_status: string | null;
  request_note: string;
  request_updated_at: string | null;
}

// أقسام شاشة الممولين — "الكل" يضم كل المصادر
export const TAXPAYER_SOURCES = [
  { key: "all", label: "الكل" },
  { key: "imported", label: "المرفوعة" },
  { key: "survey", label: "الحصر" },
  { key: "request", label: "طلبات" },
];

export interface TaxpayerModification {
  id: number;
  taxpayer_id: number;
  type: string;
  mod_date: string;
  address: string;
  activity: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export const MODIFICATION_TYPES = [
  "تغيير عنوان",
  "إضافة فرع",
  "إضافة مخزن",
  "إضافة نشاط فرعي",
];

// الطلبات
export interface Request {
  id: number;
  department: string;
  type: string;
  applicant_id: string | null;
  tax_number: string;
  national_id: string;
  phone: string;
  name: string;
  activity: string;
  address: string;
  start_date: string;
  latitude: number | null;
  longitude: number | null;
  details: string;
  status: string;
  appointment: string;
  response: string;
  created_at: string;
}

// طلبات الحصر
export const SURVEY_REQUEST_TYPES = [
  "إضافة نشاط فرعي",
  "إضافة فرع",
  "إضافة مخزن",
  "تغيير عنوان",
  "طباعة بطاقة ضريبية",
  "تجديد بطاقة ضريبية",
  "بدل فاقد بطاقة ضريبية",
  "طباعة مركز ضريبي",
  "وثيقة بيانات",
  "مقابلة مأمور الحصر",
  "فتح ملف ضريبي",
];
// طلبات الفحص
export const EXAM_REQUEST_TYPES = [
  "توقف جزئي",
  "توقف نهائي",
  "طلب محاسبة",
  "مقابلة مأمور الفحص",
];

export const REQUEST_TYPES = [...SURVEY_REQUEST_TYPES, ...EXAM_REQUEST_TYPES];

export const REQUEST_STATUS = [
  "جديد", "تحت المراجعة", "مطلوب استيفاء", "معتمد", "مرفوض", "مغلق",
];

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  "جديد": "#2563EB",
  "تحت المراجعة": "#D97706",
  "مطلوب استيفاء": "#7C3AED",
  "معتمد": "#0E7C66",
  "مرفوض": "#DC2626",
  "مغلق": "#64748B",
};

// الشكاوى
export interface Complaint {
  id: number;
  complainant_name: string;
  complainant_national_id: string;
  complainant_phone: string;
  accused_name: string;
  activity: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  details: string;
  status: string;
  photos: string[];
  created_at: string;
  office_id: number | null;
  tracking_code: string | null;    // رقم الشكوى للمواطن
  assigned_to: string | null;      // مأمور الحصر المختص
  escalated: boolean;              // مصعّدة لرئيس المأمورية
  escalated_at: string | null;
  escalation_note: string;
  official_reply: string;          // الرد الرسمي (يظهر للمواطن)
  replied_at: string | null;
  updated_at: string | null;
}

export const COMPLAINT_STATUS = ["جديد", "قيد المراجعة", "محوّل", "منتهي", "مرفوض"];
export const COMPLAINT_CLOSED = ["محوّل", "منتهي", "مرفوض"];

// أسماء الحالات كما تظهر للمواطن
export const COMPLAINT_PUBLIC_STATUS: Record<string, string> = {
  "جديد": "مستلمة",
  "قيد المراجعة": "قيد المراجعة",
  "محوّل": "تم التحويل",
  "منتهي": "تم الحل",
  "مرفوض": "مرفوضة",
};

// نتيجة متابعة الشكوى (بدون تسجيل دخول)
export interface ComplaintTracking {
  tracking_code: string;
  status: string;
  responsible: string;
  office_name: string | null;
  created_at: string;
  updated_at: string;
  official_reply: string;
  replied_at: string | null;
}

// طلب فتح ملف (ممول بدون ملف)
export const FILE_REQUEST_STATUS = ["تم الاستلام", "قيد المراجعة", "مطلوب مستندات", "تم فتح الملف", "مرفوض"];
// الحالات التي يضبطها الموظف يدويًا («تم فتح الملف» تلقائيًا عند اعتماد الرقم الضريبي)
export const FILE_REQUEST_STAFF_STATUS = ["قيد المراجعة", "مطلوب مستندات", "مرفوض"];
export const FILE_REQUEST_COLORS: Record<string, string> = {
  "تم الاستلام": "#2563EB",
  "قيد المراجعة": "#D97706",
  "مطلوب مستندات": "#7C3AED",
  "تم فتح الملف": "#0E7C66",
  "مرفوض": "#DC2626",
};

export interface FileRequestTracking {
  request_code: string;
  status: string;
  note: string;
  office_name: string | null;
  tax_number: string | null;
  created_at: string;
  updated_at: string;
}

// طلب تفعيل حساب ممول صاحب ملف
export interface TaxpayerActivation {
  id: number;
  user_id: string | null;
  taxpayer_id: number;
  office_id: number | null;
  tax_number: string;
  full_name: string;
  national_id: string;
  phone: string;
  status: string; // pending / verified / rejected
  code_issued_at: string | null;
  attempts: number;
  created_at: string;
  taxpayers?: { name: string; phone: string } | null;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  title: string;
  body: string;
  attachments: string[];
  status: string; // new / read / replied / closed
  read: boolean;
  created_at: string;
}

// إشعار
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  body: string;
  kind: string; // message / task / request / appointment / attendance / file_approved / general
  link_type: string;
  link_id: number | null;
  read: boolean;
  created_at: string;
}

// محادثة (لعرض قائمة المراسلات لدى الموظف)
export interface Conversation {
  profile: Profile;
  lastMessage?: Message;
  unread: number;
}
