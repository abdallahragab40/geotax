// شاشة إدارة الموظفين — تتكيف حسب دور المستخدم:
// admin → يضيف رؤساء المأموريات (مع اختيار مأمورية)
// office_head → يضيف مدير الحاسب فقط (في مأموريته تلقائيًا)
// it_manager → يضيف بقية موظفي المأمورية
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { listStaff } from "../../data/api";
import { listOffices } from "../../data/offices";
import { useAuth } from "../../context/AuthContext";
import { Profile, Role, ROLE_LABELS, Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

type RoleOpt = { role: Role; label: string };

const ROLES_BY_CALLER: Record<string, RoleOpt[]> = {
  admin: [{ role: "office_head", label: "رئيس مأمورية" }],
  office_head: [{ role: "it_manager", label: "مدير الحاسب الآلي" }],
  it_manager: [
    { role: "survey_manager", label: "مدير الحصر" },
    { role: "survey_reviewer", label: "مراجع حصر" },
    { role: "surveyor", label: "مأمور حصر" },
    { role: "exam_manager", label: "مدير الفحص" },
    { role: "exam_reviewer", label: "مراجع فحص" },
    { role: "examiner", label: "مأمور فحص" },
  ],
};

const TITLE_BY_CALLER: Record<string, string> = {
  admin: "رؤساء المأموريات",
  office_head: "مدير الحاسب الآلي",
  it_manager: "موظفو المأمورية",
  survey_manager: "موظفو الحصر",
  survey_reviewer: "مأمورو الحصر",
  exam_manager: "موظفو الفحص",
  exam_reviewer: "مأمورو الفحص",
};

// من يظهر لكل دور في قائمة الموظفين
const VISIBLE_ROLES: Record<string, Role[]> = {
  admin: ["office_head"],
  office_head: ["office_head", "it_manager", "survey_manager", "survey_reviewer", "surveyor", "exam_manager", "exam_reviewer", "examiner"],
  it_manager: ["office_head", "it_manager", "survey_manager", "survey_reviewer", "surveyor", "exam_manager", "exam_reviewer", "examiner"],
  survey_manager: ["survey_manager", "survey_reviewer", "surveyor"],
  survey_reviewer: ["survey_reviewer", "surveyor"],
  exam_manager: ["exam_manager", "exam_reviewer", "examiner"],
  exam_reviewer: ["exam_reviewer", "examiner"],
};

export default function ManageEmployeesScreen() {
  const { adminCreateEmployee, profile } = useAuth();
  const callerRole = profile?.role || "";
  const assignable = ROLES_BY_CALLER[callerRole] || [];
  const isAdmin = callerRole === "admin";

  const [staff, setStaff] = useState<Profile[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [modal, setModal] = useState(false);
  const [officePickerOpen, setOfficePickerOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [empNumber, setEmpNumber] = useState("");
  const [password, setPassword] = useState("12345678");
  const [role, setRole] = useState<Role>((assignable[0]?.role ?? "surveyor") as Role);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // نحمّل المأموريات دائمًا لأننا نحتاج code المأمورية عند اشتقاق البريد
    listOffices().then(setOffices).catch(() => {});
  }, []);

  const load = useCallback(() => {
    listStaff().then((rows) => {
      const allowed = VISIBLE_ROLES[callerRole] || [];
      // admin يرى كل رؤساء المأموريات (بغض النظر عن office_id)
      // الباقي يرى الأدوار المسموحة داخل مأموريته فقط
      const filtered = rows.filter((r) => {
        if (!allowed.includes(r.role as Role)) return false;
        if (callerRole === "admin") return true;
        if (!profile?.office_id) return false;
        return r.office_id === profile.office_id;
      });
      setStaff(filtered);
    }).catch(() => {});
  }, [callerRole, profile?.office_id]);
  useFocusEffect(useCallback(() => load(), [load]));

  function deriveEmail(): string {
    // الإيميل الداخلي مبني على رقم الحاسب + كود المأمورية (نفس نمط شاشة الدخول)
    const officeCode = isAdmin
      ? selectedOffice?.code
      : offices.find((o) => o.id === profile?.office_id)?.code;
    if (!officeCode) throw new Error("لم يتم تحديد كود المأمورية.");
    return `emp${empNumber.trim()}@office${officeCode}.geotax.local`;
  }

  async function submit() {
    if (!fullName.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل الاسم بالكامل.");
      return;
    }
    if (!empNumber.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل رقم الحاسب.");
      return;
    }
    if (isAdmin && !selectedOffice) {
      Alert.alert("بيانات ناقصة", "اختر المأمورية.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("كلمة مرور ضعيفة", "يجب 6 أحرف على الأقل.");
      return;
    }
    setSaving(true);
    try {
      const email = deriveEmail();
      await adminCreateEmployee({
        email,
        password,
        fullName: fullName.trim(),
        role,
        officeId: isAdmin ? selectedOffice?.id : undefined,
        employeeNumber: empNumber.trim(),
      });
      setModal(false);
      setFullName(""); setEmpNumber(""); setPassword("12345678");
      setSelectedOffice(null);
      load();
      Alert.alert("تم", `تم إنشاء الحساب بنجاح.\nالبريد: ${email}\nكلمة المرور: ${password}`);
    } catch (e: any) {
      Alert.alert("تعذّر الإنشاء", e?.message ?? "حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  }

  const renderItem = ({ item }: { item: Profile }) => (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: item.role === "admin" ? "#7C3AED" : colors.primary }]}>
        <Ionicons name={item.role === "admin" ? "shield" : "person"} size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.full_name || "بدون اسم"}</Text>
        <Text style={styles.roleLabel}>
          {ROLE_LABELS[item.role] ?? item.role}
          {item.employee_number ? ` — ${item.employee_number}` : ""}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{TITLE_BY_CALLER[callerRole] || "الموظفون"}</Text>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>لا يوجد موظفون بعد.</Text>}
      />

      {assignable.length > 0 && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setModal(true)}>
          <Ionicons name="person-add" size={22} color={colors.white} />
          <Text style={styles.fabText}>إضافة {assignable[0].label}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                إضافة {assignable[0]?.label || "موظف"} جديد
              </Text>

              <TextInput
                style={styles.input}
                placeholder="الاسم بالكامل"
                placeholderTextColor={colors.muted}
                value={fullName}
                onChangeText={setFullName}
              />

              <TextInput
                style={styles.input}
                placeholder="رقم الحاسب"
                placeholderTextColor={colors.muted}
                value={empNumber}
                onChangeText={setEmpNumber}
                keyboardType="number-pad"
              />

              {isAdmin && (
                <TouchableOpacity style={styles.picker} onPress={() => setOfficePickerOpen(true)}>
                  <Text style={styles.pickerText}>
                    {selectedOffice ? `${selectedOffice.name} (${selectedOffice.code})` : "اختر المأمورية"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.input}
                placeholder="كلمة المرور الافتراضية (6+ أحرف)"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {assignable.length > 1 && (
                <>
                  <Text style={styles.label}>الصلاحية</Text>
                  <View style={styles.roleRow}>
                    {assignable.map((r) => {
                      const active = role === r.role;
                      return (
                        <TouchableOpacity
                          key={r.role}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setRole(r.role)}
                        >
                          <Text style={[styles.chipText, active && { color: colors.white }]}>{r.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.save]} onPress={submit} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>إنشاء</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* مُنتقي المأمورية (للأدمن فقط) */}
      <Modal visible={officePickerOpen} transparent animationType="slide" onRequestClose={() => setOfficePickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المأمورية</Text>
            <FlatList
              data={offices}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.officeRow}
                  onPress={() => {
                    setSelectedOffice(item);
                    setOfficePickerOpen(false);
                  }}
                >
                  <Text style={styles.officeName}>{item.name} — {item.governorate}</Text>
                  <Text style={styles.officeCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setOfficePickerOpen(false)}>
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" },
  list: { padding: spacing.lg, paddingBottom: 96 },
  row: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right" },
  roleLabel: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 60, fontSize: 15 },
  fab: { position: "absolute", bottom: spacing.xl, left: spacing.lg, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, gap: spacing.xs, ...shadow },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalScroll: { flexGrow: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right", marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  picker: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, marginBottom: spacing.md },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1, textAlign: "right" },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  roleRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  actions: { flexDirection: "row-reverse", gap: spacing.md },
  btn: { flex: 1, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  save: { backgroundColor: colors.primary },
  saveText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  officeRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  officeName: { color: colors.text, fontSize: 15, flex: 1, textAlign: "right" },
  officeCode: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
