// التقارير: سحب بيانات لفترة معيّنة وتصديرها Excel أو PDF
import React, { useLayoutEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { exportToExcel, exportToPDF } from "../../data/export";
import { formatDateTime } from "../../utils";
import { colors, radius, spacing, shadow } from "../../theme";

const REPORTS = [
  { key: "taxpayers",     label: "الممولين",         table: "taxpayers" },
  { key: "surveys",       label: "الحصر على الطبيعة", table: "surveys" },
  { key: "office_reqs",   label: "الحصر المكتبي",     table: "requests" },
  { key: "inspections",   label: "المعاينات",         table: "inspections" },
  { key: "partial_stops", label: "التوقف الجزئي",     table: "partial_stops" },
  { key: "final_stops",   label: "التوقف النهائي",    table: "final_stops" },
  { key: "tasks",         label: "المهام",            table: "tasks" },
  { key: "requests",      label: "الطلبات (كل)",      table: "requests" },
  { key: "complaints",    label: "الشكاوى",          table: "complaints" },
  { key: "branches",      label: "الفروع",           table: "branches" },
  { key: "warehouses",    label: "المخازن",          table: "warehouses" },
];

function mapRow(type: string, r: any): Record<string, any> {
  switch (type) {
    case "taxpayers":
      return { "الاسم": r.name, "النشاط": r.activity, "العنوان": r.address, "رقم التسجيل": r.tax_number, "الرقم القومي": r.national_id, "الهاتف": r.phone, "الحالة": r.status, "حالة النشاط": r.activity_status, "المصدر": r.source, "مسجل": r.registered ? "نعم" : "لا", "التاريخ": formatDateTime(r.created_at) };
    case "office_reqs":
      return { "نوع الطلب": r.type, "الإدارة": r.department, "الاسم": r.name, "رقم التسجيل": r.tax_number, "الحالة": r.status, "الموعد": r.appointment, "الرد": r.response, "التاريخ": formatDateTime(r.created_at) };
    case "inspections":
      return { "رقم الممول": r.taxpayer_id, "تاريخ المعاينة": r.inspection_date, "الوقت": r.start_time + (r.end_time ? `-${r.end_time}` : ""), "النتيجة": r.result, "الموقع الفعلي": (r.exam_latitude && r.exam_longitude) ? `${r.exam_latitude},${r.exam_longitude}` : "", "ملاحظات": r.notes, "التاريخ": formatDateTime(r.created_at) };
    case "partial_stops":
    case "final_stops":
      return { "رقم الممول": r.taxpayer_id, "تاريخ التوقف": r.stop_date, "السبب": r.reason, "ملاحظات": r.notes, "التاريخ": formatDateTime(r.created_at) };
    case "tasks":
      return { "رقم المهمة": r.id, "النوع": r.task_type, "الأولوية": r.priority, "تاريخ التنفيذ": r.due_date, "الحالة": r.status, "عدد الملفات": (r.taxpayer_ids ?? []).length, "تاريخ الإسناد": formatDateTime(r.created_at) };
    case "requests":
      return { "النوع": r.type, "الإدارة": r.department, "الاسم": r.name, "الحالة": r.status, "الموعد": r.appointment, "الرد": r.response, "التاريخ": formatDateTime(r.created_at) };
    case "complaints":
      return { "المشكو": r.accused_name, "النشاط": r.activity, "العنوان": r.address, "المقدّم": r.complainant_name, "الهاتف": r.complainant_phone, "الحالة": r.status, "التاريخ": formatDateTime(r.created_at) };
    case "branches":
      return { "رقم الممول": r.taxpayer_id, "اسم الفرع": r.name, "العنوان": r.address, "التاريخ": formatDateTime(r.created_at) };
    case "warehouses":
      return { "رقم الممول": r.taxpayer_id, "العنوان": r.address, "التاريخ": formatDateTime(r.created_at) };
    default:
      return { "الاسم": r.name, "رقم التسجيل": r.tax_number, "الحالة": r.status, "ملاحظات": r.notes, "التاريخ": formatDateTime(r.created_at) };
  }
}

export default function ReportsScreen() {
  const navigation = useNavigation<any>();
  const [type, setType] = useState("taxpayers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "التقارير" }); }, [navigation]);

  async function fetchRows() {
    const rep = REPORTS.find((x) => x.key === type)!;
    let q = supabase.from(rep.table).select("*").order("created_at", { ascending: false });
    if (from.trim()) q = q.gte("created_at", from.trim());
    if (to.trim()) q = q.lte("created_at", to.trim() + "T23:59:59");
    if (type === "office_reqs") q = q.in("type", [
      "إضافة نشاط فرعي", "إضافة فرع", "إضافة مخزن", "تغيير عنوان",
      "طباعة بطاقة ضريبية", "تجديد بطاقة ضريبية", "بدل فاقد بطاقة ضريبية",
      "طباعة مركز ضريبي", "وثيقة بيانات", "مقابلة مأمور الحصر", "فتح ملف ضريبي",
    ]);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []).map((r) => mapRow(type, r));
    if (rows.length === 0) throw new Error("لا توجد سجلات في الفترة المحددة.");
    return rows;
  }

  async function exportExcel() {
    setLoading(true);
    try {
      const rows = await fetchRows();
      const rep = REPORTS.find((x) => x.key === type)!;
      await exportToExcel(rows, `تقرير_${rep.label}_${Date.now()}`);
    } catch (e: any) { Alert.alert("تعذّر التصدير", e?.message ?? "خطأ."); }
    finally { setLoading(false); }
  }

  async function exportPdf() {
    setLoading(true);
    try {
      const rows = await fetchRows();
      const rep = REPORTS.find((x) => x.key === type)!;
      await exportToPDF(rows, `تقرير ${rep.label}`);
    } catch (e: any) { Alert.alert("تعذّر التصدير", e?.message ?? "خطأ."); }
    finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>نوع التقرير</Text>
        <View style={styles.chips}>
          {REPORTS.map((r) => {
            const active = type === r.key;
            return (
              <TouchableOpacity key={r.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(r.key)}>
                <Text style={[styles.chipText, active && { color: colors.white }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>من تاريخ (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="2026-01-01" placeholderTextColor={colors.muted} value={from} onChangeText={setFrom} />
        <Text style={styles.label}>إلى تاريخ (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="2026-12-31" placeholderTextColor={colors.muted} value={to} onChangeText={setTo} />
        <Text style={styles.hint}>اترك الحقول فارغة لتصدير كل البيانات.</Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={exportExcel} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="document" size={18} color={colors.white} /><Text style={styles.btnText}>تصدير Excel</Text></>)}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#DC2626" }, loading && { opacity: 0.6 }]} onPress={exportPdf} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="document-text" size={18} color={colors.white} /><Text style={styles.btnText}>تصدير PDF</Text></>)}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs, marginTop: spacing.sm },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right" },
  hint: { color: colors.muted, fontSize: 12, textAlign: "right", marginTop: spacing.sm },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, padding: spacing.lg },
  btn: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
