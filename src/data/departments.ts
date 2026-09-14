// تعريف الإدارات الثلاث وحقولها — يقود الشاشات العامة (قائمة/نموذج/تفاصيل)
import { colors } from "../theme";

export type FieldType = "text" | "number" | "multiline";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
}

export interface DepartmentDef {
  key: string; // المعرّف الداخلي
  table: string; // اسم جدول Supabase
  title: string; // العنوان المعروض
  icon: string; // اسم أيقونة Ionicons
  color: string;
  role: string; // الدور المسؤول عن هذه الإدارة
  fields: FieldDef[]; // الحقول النصية/الرقمية
  statusOptions: string[];
  statusColors: Record<string, string>;
  hasLocation: boolean; // يلتقط GPS؟
  hasPhotos: boolean;
}

const commonStatusColor = {
  green: "#0E7C66",
  amber: "#D97706",
  red: "#DC2626",
  gray: "#64748B",
  blue: "#2563EB",
};

export const DEPARTMENTS: Record<string, DepartmentDef> = {
  survey: {
    key: "survey",
    table: "surveys",
    title: "إدارة الحصر",
    icon: "map",
    color: "#0E7C66",
    role: "surveyor",
    fields: [
      { key: "tax_number", label: "رقم التسجيل الضريبي", type: "text", placeholder: "مثال: 123-456-789", required: true },
      { key: "name", label: "اسم النشاط", type: "text", placeholder: "اسم المنشأة" },
      { key: "address", label: "العنوان", type: "text", placeholder: "عنوان النشاط" },
      { key: "sub_activities", label: "الأنشطة الفرعية", type: "multiline", placeholder: "الأنشطة الفرعية وقت المعاينة" },
      { key: "notes", label: "ملاحظات", type: "multiline", placeholder: "ملاحظات المعاينة" },
    ],
    statusOptions: ["تمت", "قيد المتابعة", "مغلق", "غير ممول"],
    statusColors: {
      "تمت": commonStatusColor.green,
      "قيد المتابعة": commonStatusColor.amber,
      "مغلق": commonStatusColor.red,
      "غير ممول": commonStatusColor.gray,
    },
    hasLocation: true,
    hasPhotos: true,
  },

  examination: {
    key: "examination",
    table: "examinations",
    title: "إدارة الفحص",
    icon: "document-text",
    color: "#2563EB",
    role: "examiner",
    fields: [
      { key: "tax_number", label: "رقم التسجيل الضريبي", type: "text", placeholder: "رقم التسجيل", required: true },
      { key: "name", label: "اسم النشاط / الممول", type: "text", placeholder: "الاسم" },
      { key: "file_number", label: "رقم الملف", type: "text", placeholder: "رقم الملف" },
      { key: "exam_years", label: "سنوات الفحص", type: "text", placeholder: "مثال: 2021-2023" },
      { key: "revenue", label: "الإيراد", type: "number", placeholder: "0" },
      { key: "net_profit", label: "صافي الربح / الوعاء", type: "number", placeholder: "0" },
      { key: "tax_due", label: "الضريبة المستحقة", type: "number", placeholder: "0" },
      { key: "notes", label: "ملاحظات", type: "multiline", placeholder: "ملاحظات الفحص" },
    ],
    statusOptions: ["قيد الفحص", "انتهى الفحص", "محال للطعن"],
    statusColors: {
      "قيد الفحص": commonStatusColor.amber,
      "انتهى الفحص": commonStatusColor.green,
      "محال للطعن": commonStatusColor.blue,
    },
    hasLocation: false,
    hasPhotos: true,
  },

  seizure: {
    key: "seizure",
    table: "seizures",
    title: "إدارة الحجز",
    icon: "lock-closed",
    color: "#B91C1C",
    role: "seizer",
    fields: [
      { key: "tax_number", label: "رقم التسجيل الضريبي", type: "text", placeholder: "رقم التسجيل", required: true },
      { key: "name", label: "اسم النشاط / الممول", type: "text", placeholder: "الاسم" },
      { key: "decision_number", label: "رقم قرار الحجز", type: "text", placeholder: "رقم القرار" },
      { key: "amount", label: "المبلغ المحجوز من أجله", type: "number", placeholder: "0" },
      { key: "seized_items", label: "الأصناف المحجوزة", type: "multiline", placeholder: "وصف الأصناف" },
      { key: "seizure_date", label: "تاريخ الحجز", type: "text", placeholder: "يوم/شهر/سنة" },
      { key: "notes", label: "ملاحظات", type: "multiline", placeholder: "ملاحظات" },
    ],
    statusOptions: ["محجوز", "مرفوع", "مُباع بالمزاد"],
    statusColors: {
      "محجوز": commonStatusColor.red,
      "مرفوع": commonStatusColor.green,
      "مُباع بالمزاد": commonStatusColor.gray,
    },
    hasLocation: true,
    hasPhotos: true,
  },
};

// إدارة الحجز مُستبعدة من الإصدار الحالي (تُضاف لاحقًا)
export const DEPARTMENT_LIST = [
  DEPARTMENTS.survey,
  DEPARTMENTS.examination,
];

export function statusColor(dept: DepartmentDef, status?: string): string {
  if (!status) return colors.muted;
  return dept.statusColors[status] ?? colors.muted;
}
